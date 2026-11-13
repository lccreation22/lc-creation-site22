import { leadSubmissionId, queueLeadBackup } from '../lc-lead-backup.js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    let body = req.body;

    if (!body || typeof body !== "object") {
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => (data += chunk));
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = raw ? JSON.parse(raw) : {};
    }

    if (body.website && body.website.trim() !== "") {
      return res.status(200).json({ ok: true, skipped: "honeypot" });
    }

    const apiKey = process.env.RESEND_API;
    const from = process.env.RESEND_FROM;
    const to = process.env.RESEND_TO;

    const submissionId = leadSubmissionId(body);

    const {
      source,
      projet,
      prenom,
      nom,
      emailClient,
      tel,
      message,
      adresse,
      codePostal,
      ville,
      distance,
      engagement,
      terrain,
      typeProjet,
      pack,
      taille,
      budgetText,
      chauffageTxt,
      traitementTxt,
      couvertureTxt,
      entretienTxt,
      loisirsTxt,
      delaiTxt,
      contactPrefTxt,
      estimationText,
      evacChoice,
      evacM3,
      plageMateriau,
      plageSurface
    } = body;

    const isBali = source === "page-bali" || pack === "Bali" || projet === "Piscine Bali";

    let subject = "";
    let text = "";

    if (isBali) {
      subject = `Nouveau lead Piscine Bali – ${prenom || ""} ${nom || ""}`.trim();

      text = [
        "Nouvelle demande via la page Piscine Bali – LC Création",
        "",
        "Coordonnées client :",
        `Prénom : ${prenom || "-"}`,
        `Nom : ${nom || "-"}`,
        `E-mail : ${emailClient || "-"}`,
        `Téléphone : ${tel || "non renseigné"}`,
        "",
        "Adresse du projet :",
        `Rue + numéro : ${adresse || "non renseigné"}`,
        `Code postal : ${codePostal || "non renseigné"}`,
        `Ville : ${ville || "non renseignée"}`,
        "",
        "Qualification :",
        `Projet : ${projet || "Piscine Bali"}`,
        `Pack : ${pack || "Bali"}`,
        `Base : ${taille || "6 x 3 m"}`,
        `Distance : ${distance || "-"}`,
        `Budget : ${budgetText || "-"}`,
        `Disponibilité : ${delaiTxt || "-"}`,
        `Terrain : ${terrain || "-"}`,
        `Engagement : ${engagement || "-"}`,
        "",
        `Estimation affichée : ${estimationText || "Piscine Bali à partir de 29 990€ TVAC"}`,
        "",
        "Message du client :",
        message || "(aucun message complémentaire)"
      ].join("\n");
    } else {
      subject = `Demande estimation piscine bois – ${prenom || ""} ${nom || ""}`.trim();

      text = [
        "Nouvelle configuration piscine via le site LC Création",
        "",
        "Coordonnées client :",
        `Prénom : ${prenom || "-"}`,
        `Nom : ${nom || "-"}`,
        `E-mail : ${emailClient || "-"}`,
        `Téléphone : ${tel || "non renseigné"}`,
        "",
        "Localisation :",
        `Code postal / Ville : ${codePostal || "non renseigné"}`,
        `Terrain : ${terrain || "-"}`,
        "",
        `Projet : ${typeProjet || "-"}`,
        `Pack choisi : ${pack || "-"}`,
        `Taille : ${taille || "-"}`,
        budgetText || "",
        "",
        chauffageTxt || "",
        traitementTxt || "",
        couvertureTxt || "",
        entretienTxt || "",
        loisirsTxt || "",
        "",
        delaiTxt || "",
        contactPrefTxt || "",
        "",
        `Évacuation : ${evacChoice || "Non"} ${evacM3 ? `(${evacM3} m³)` : ""}`,
        `Plage/terrasse : ${plageMateriau || "Aucune"} ${plageSurface ? `(${plageSurface} m²)` : ""}`,
        "",
        `Estimation indicative affichée au client : ${estimationText || "—"} TVAC`,
        "",
        "Message du client :",
        message || "(aucun message complémentaire)"
      ].join("\n");
    }

    // Additive tracking metadata: failure here must never prevent delivery.
    let tracking = null;
    try {
      const helper = await import('../lc-lead-tracking.js');
      tracking = helper.prepareLeadTracking(body);
      if (tracking) text += tracking.emailSuffix;
    } catch (_) { /* Keep the original email and routing fully operational. */ }

    let mailId = null;
    try {
      if (!apiKey || !from || !to) throw new Error('Missing mail configuration');
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from, to, subject, text })
      });
      const json = await r.json();

      if (!r.ok || !json.id) throw new Error('Mail not acknowledged');
      mailId = json.id;
    } catch (_) {
      console.error('lead-mail unavailable', { submission_id: submissionId });
    }

    const backup = await queueLeadBackup(body, { id: submissionId, subject, text, mailId, tracking });
    if (!mailId && backup.status !== 'queued') {
      return res.status(500).json({ ok: false, error: 'Transmission non confirmée. Réessayez ou contactez LC Création.' });
    }

    return res.status(200).json({ ok: true, id: mailId || submissionId,
      submission_id: submissionId, email_status: mailId ? 'accepted' : 'failed', backup_status: backup.status,
      ...(tracking ? { tracking: { event_id: tracking.event_id, qualified: tracking.qualified, rule: tracking.rule, parameters: tracking.parameters } } : {})
    });
  } catch (err) {
    console.error('send-lead invalid request');
    return res.status(500).json({ ok: false, error: 'Transmission non confirmée.' });
  }
}
