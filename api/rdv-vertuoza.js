import { createHash } from 'node:crypto';

const destination = 'opportunite+695292@vertuoza.com';
const origins = new Set(['null', 'https://www.lc-creation.be', 'https://lc-creation.be']);
const digest = value => createHash('sha256').update(value).digest('hex');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers?.origin;
  if (origin && origins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  const configured = !!(process.env.RESEND_API && process.env.RESEND_FROM);
  if (req.method === 'GET') return res.status(200).json({ service: 'lc-rdv-vertuoza', version: 1, ready: configured });
  if (!origin || !origins.has(origin)) return res.status(403).json({ ok: false, error: 'Origine non autorisée.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
  if (!configured) return res.status(503).json({ ok: false, error: 'Service d’envoi non configuré.' });
  let input;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 180000) throw Error();
    input = JSON.parse(raw);
  } catch { return res.status(400).json({ ok: false, error: 'Dossier illisible ou trop volumineux.' }); }
  const textField = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max;
  const c = input?.client;
  if (!input || input.schemaVersion !== 1 || !/^LC-[a-zA-Z0-9-]{1,150}$/.test(input.reference || '') ||
      !c || !textField(c.name, 200) || /[\r\n]/.test(c.name) || !textField(c.email, 254) ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(c.email) || !textField(c.phone, 100) ||
      !textField(input.details, 120000)) {
    return res.status(400).json({ ok: false, error: 'Nom, e-mail, téléphone ou référence du dossier invalide.' });
  }
  const canonical = JSON.stringify({ schemaVersion: 1, reference: input.reference,
    client: { name: c.name, email: c.email, phone: c.phone }, details: input.details });
  const key = 'lc-rdv-' + digest(canonical);
  // Recipient is fixed; never use a recipient or sender supplied by the browser.
  const text = `RENDEZ-VOUS LC CRÉATION — OPPORTUNITÉ\nRéférence : ${input.reference}\n\nCLIENT / PROSPECT\nNom : ${c.name}\nEmail : ${c.email}\nTéléphone : ${c.phone}\n\n${input.details}\n\nCréer ou rattacher l’opportunité au prospect identifié ci-dessus. Dossier préparatoire ; aucun devis à envoyer au client.`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: [destination],
        reply_to: c.email, subject: `RDV LC Création — ${c.name} — ${input.reference}`, text })
    });
    const data = await response.json();
    if (!response.ok || !data.id) return res.status(502).json({ ok: false, error: 'Le service d’envoi n’a pas confirmé l’acceptation. Réessayez le même dossier ; ne créez pas une copie.' });
    return res.status(200).json({ ok: true, state: 'email_accepted', id: data.id, acceptedAt: new Date().toISOString(), destination });
  } catch {
    return res.status(504).json({ ok: false, uncertain: true, error: 'Délai dépassé : l’acceptation de l’e-mail est inconnue. Réessayez le même dossier dans les 24 heures.' });
  }
}
