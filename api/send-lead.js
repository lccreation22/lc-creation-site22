import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // Validation minimum
    if (!data.prenom || !data.nom || !data.emailClient) {
      return res.status(422).json({ ok: false, error: "Missing required fields" });
    }

    const subject = `Demande estimation piscine bois – ${data.prenom} ${data.nom}`;

    // Mail lisible (reprend tout ton payload)
    const lines = [
      "Nouvelle configuration piscine via le site LC Création",
      "",
      ...Object.entries(data).map(([k, v]) => `${k.toUpperCase()} : ${v}`)
    ];

    await resend.emails.send({
      from: "LC Création <contact@lc-creation.be>",
      to: "lecocqcedric@outlook.be",
      replyTo: data.emailClient,
      subject,
      text: lines.join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Send failed" });
  }
}
