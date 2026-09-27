// Server-only lead qualification and attribution. Never sends data to ad platforms.
import { randomUUID } from 'node:crypto';

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CLICKS = ['gclid', 'gbraid', 'wbraid', 'fbclid'];
const offers = new Set(['LC_6_3', 'general_pool', 'concrete']);
export function cleanAttribution(input = {}) {
  const out = {};
  for (const key of UTM) {
    const v = input[key];
    if (typeof v === 'string' && /^[a-zA-Z0-9_. -]{1,100}$/.test(v) && !/\d{7}/.test(v)) out[key] = v;
  }
  for (const key of CLICKS) {
    const v = input[key];
    if (typeof v === 'string' && /^[a-zA-Z0-9_.-]{1,500}$/.test(v)) out[key] = v;
  }
  return out;
}

export function qualify(body) {
  const budget = String(body.budgetText || '');
  const band = /Plus de 40|40k\+/.test(budget) ? '40k_plus' : /30\s*000.*40\s*000/.test(budget) ? '30_40k' : /20\s*000.*30\s*000/.test(budget) ? '20_30k' : /15\s*000.*20\s*000/.test(budget) ? '15_20k' : 'unknown';
  const timing = /3 à 6 mois/.test(body.delaiTxt || '') ? '3_6_months' : /6 à 12 mois/.test(body.delaiTxt || '') ? '6_12_months' : /saison suivante/.test(body.delaiTxt || '') ? 'next_season' : 'research';
  const emailValid = typeof body.emailClient === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.emailClient.trim());
  const phone = String(body.tel || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
  const phoneValid = /^(?:0[1-9]\d{7,8}|\+[1-9]\d{7,14})$/.test(phone) && !/^(\d)\1+$/.test(phone.replace(/^\+/, ''));
  const postal = /^\s*(\d{4})(?:\s|$)/.exec(String(body.codePostal || ''));
  const zip = postal ? Number(postal[1]) : 0;
  const zone = zip >= 1300 && zip <= 1499 || zip >= 4000 && zip <= 7999;
  const dimension = ({ Compacte: '5x3_2', Familiale: '6x4_2', Grande: '8_35x4_9' })[body.taille] || 'unknown';
  const estimate = Number(String(body.estimationText || '').replace(/[^0-9]/g, ''));
  const budgetCoherent = estimate > 0 && (band === '40k_plus' || band === '30_40k' && estimate <= 40000);
  // The existing configurator only collects wooden pools. Never infer material from free text.
  const qualified = !!(emailValid && phoneValid && zone && budgetCoherent && ['3_6_months', '6_12_months'].includes(timing) && dimension !== 'unknown');
  return { qualified, rule: 'lc_v1', parameters: { pool_type: 'wood', budget_band: band, project_timing: timing, dimension_band: dimension, source_offer: offers.has(body.tracking?.source_offer) ? body.tracking.source_offer : 'general_pool', form_name: 'configurateur_piscine', qualification_rule: 'lc_v1' } };
}

export function prepareLeadTracking(body) {
  if (body.tracking?.schema_version !== 1) return null;
  const id = /^lc-[0-9a-f-]{36}$/.test(body.tracking.submission_id || '') ? body.tracking.submission_id : 'lc-' + randomUUID();
  const analytics = body.tracking.consent?.analytics === true;
  const marketing = body.tracking.consent?.marketing === true;
  const raw = cleanAttribution(body.tracking.attribution);
  const attribution = {};
  for (const key of UTM) if (analytics && raw[key]) attribution[key] = raw[key];
  for (const key of CLICKS) if (marketing && raw[key]) attribution[key] = raw[key];
  const result = qualify(body);
  const record = { schema_version: 1, submission_id: id, event_id: id, ...result, attribution, consent: { analytics, marketing }, captured_at: new Date().toISOString() };
  // Append after the original email; leave all existing labels and recipients intact.
  record.emailSuffix = '\n\n--- LC TRACKING V1 ---\n' + JSON.stringify({ ...record, emailSuffix: undefined }) + '\n--- FIN LC TRACKING ---';
  return record;
}
