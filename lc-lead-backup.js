// Server-only copy to the authenticated Make queue. Never expose these settings
// in browser assets. Make processes sequentially and deduplicates submission_id.
import { randomUUID } from 'node:crypto';

export function leadSubmissionId(body) {
  const candidate = body.submission_id || body.tracking?.submission_id;
  return /^lc-[0-9a-f-]{36}$/.test(candidate || '') ? candidate : 'lc-' + randomUUID();
}

export function backupRecord(body, { id, subject, text, mailId, tracking }) {
  const { tracking: _rawTracking, website: _trap, ...configuration } = body;
  // Retain only the existing server-sanitized, consent-filtered attribution.
  if (tracking) {
    const { emailSuffix: _suffix, ...safeTracking } = tracking;
    configuration.tracking = safeTracking;
  }
  return {
    prenom: body.prenom || '', nom: body.nom || '', emailClient: body.emailClient || '',
    tel: body.tel || '', codePostal: body.codePostal || '', terrain: body.terrain || '',
    projet: body.typeProjet || body.projet || body.poolType || '', pack: body.pack || '', taille: body.taille || '',
    budget: body.budgetText || '', delai: body.delaiTxt || '', contact: body.contactPrefTxt || '',
    evacuation: `${body.evacChoice || 'Non'}${body.evacM3 ? ` (${body.evacM3} m³)` : ''}`,
    terrasse: `${body.plageMateriau || 'Aucune'}${body.plageSurface ? ` (${body.plageSurface} m²)` : ''}`,
    estimation: body.estimationText || '', received_at: new Date().toISOString(), subject, text,
    submission_id: id, source: body.source || 'configurateur-piscine', status: 'Copie de secours',
    resend_id: mailId || '', email_status: mailId ? 'Accepté pour envoi — livraison non confirmée' : 'Envoi mail non confirmé',
    configuration_json: JSON.stringify(configuration)
  };
}

export async function queueLeadBackup(body, context) {
  const url = process.env.LEAD_BACKUP_URL;
  const key = process.env.LEAD_BACKUP_KEY;
  if (!url && !key) return { status: 'disabled' };
  try {
    if (!url || !key || new URL(url).protocol !== 'https:') throw new Error('Invalid configuration');
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-make-apikey': key },
      body: JSON.stringify(backupRecord(body, context)), signal: AbortSignal.timeout(8000)
    });
    // Make's default acknowledgement means durably queued, not yet in Sheets.
    if (response.status !== 200 || (await response.text()).trim() !== 'Accepted') throw new Error('Not acknowledged');
    return { status: 'queued' };
  } catch (_) {
    // Never log client data, tokens, response bodies or the secret webhook URL.
    console.error('lead-backup unavailable', { submission_id: context.id });
    return { status: 'failed' };
  }
}
