
// api/send-lead.js  (CommonJS, compatible Vercel direct)
module.exports = async (req, res) => {
  // Autorise seulement POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // Honeypot anti-bot : si rempli => on ignore
    if (data.website && String(data.website).trim() !== "") {
      return res.status(200).json({ ok: true });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL;   // ex: "LC Création <contact@lc-creation.be>"
    const to = process.env.LEADS_TO;       // ex: "lecocqcedric@outlook.be"

    if (!apiKey || !from || !to) {
      throw new Error("Env vars manquantes: RESEND_API_KEY / FROM_EMAIL / LEADS_TO");
    }

    const subject =
      `Demande estimation piscine bois – ${data.prenom || ""} ${data.nom || ""}`.trim();

    const lignes = [
      "Nouvelle configuration piscine via le site LC Création",
      "",
      "Coordonnées client :",
      `Prénom : ${data.prenom || "-"}`,
      `Nom : ${data.nom || "-"}`,
      `E-mail : ${data.emailClient || "-"}`,
      `Téléphone : ${data.tel || "non renseigné"}`,
      "",
      "Localisation :",
      `Code postal / Ville : ${data.codePostal || "non renseigné"}`,
      `Terrain : ${data.terrain || "-"}`,
      "",
      `Projet : ${data.typeProjet || "-"}`,
      `Pack choisi : ${data.pack || "-"}`,
      data.budgetText || "",
      "",
      data.chauffageTxt || "",
      data.traitementTxt || "",
      data.couvertureTxt || "",
      data.entretienTxt || "",
      data.loisirsTxt || "",
      "",
      data.delaiTxt || "",
      data.contactPrefTxt || "",
      "",
      `Estimation indicative affichée au client : ${data.estimationText || "-"} TVAC`,
      "",
      "Message du client :",
      data.message || "(aucun message complémentaire)"
    ].filter(Boolean);

    const text = lignes.join("\n");

    // Appel direct API Resend (sans dépendance)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        reply_to: data.emailClient || undefined
      })
    });

    const j = await r.json();

    if (!r.ok) {
      throw new Error(j?.message || JSON.stringify(j));
    }

    return res.status(200).json({ ok: true, id: j.id });
  } catch (err) {
    console.error("send-lead error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Erreur serveur" });
  }
};

