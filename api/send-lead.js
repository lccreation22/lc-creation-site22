const { Resend } = require("resend");

module.exports = async (req, res) => {
  // Autorise uniquement POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // Sécurité : clé présente ?
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ ok: false, error: "RESEND_API_KEY manquante" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = `Demande estimation piscine bois – ${data.prenom || ""} ${data.nom || ""}`;

    const html = `
      <h2>Nouvelle configuration piscine via le site</h2>
      <p><b>Prénom:</b> ${data.prenom || "-"}</p>
      <p><b>Nom:</b> ${data.nom || "-"}</p>
      <p><b>Email:</b> ${data.emailClient || "-"}</p>
      <p><b>Téléphone:</b> ${data.tel || "-"}</p>
      <p><b>Code postal:</b> ${data.codePostal || "-"}</p>
      <p><b>Terrain:</b> ${data.terrain || "-"}</p>
      <p><b>Projet:</b> ${data.typeProjet || "-"}</p>
      <p><b>Pack:</b> ${data.pack || "-"}</p>
      <p><b>Budget:</b> ${data.budgetText || "-"}</p>
      <p><b>Chauffage:</b> ${data.chauffageTxt || "-"}</p>
      <p><b>Traitement:</b> ${data.traitementTxt || "-"}</p>
      <p><b>Couverture:</b> ${data.couvertureTxt || "-"}</p>
      <p><b>Entretien:</b> ${data.entretienTxt || "-"}</p>
      <p><b>Loisirs:</b> ${data.loisirsTxt || "-"}</p>
      <p><b>Délai:</b> ${data.delaiTxt || "-"}</p>
      <p><b>Contact préféré:</b> ${data.contactPrefTxt || "-"}</p>
      <p><b>Estimation:</b> ${data.estimationText || "-"}</p>
      <p><b>Message:</b><br/>${(data.message || "").replace(/\n/g, "<br/>")}</p>
    `;

    const result = await resend.emails.send({
      from: "LC Création <contact@lc-creation.be>",   // ton domaine doit être vérifié Resend
      to: "lecocqcedric@outlook.be",
      reply_to: data.emailClient || undefined,
      subject,
      html
    });

    return res.status(200).json({ ok: true, id: result?.data?.id });
  } catch (err) {
    console.error("SEND-LEAD ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Erreur serveur"
    });
  }
};
