export default async function handler(req, res) {
  // Autoriser seulement POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // --- Parse body robuste ---
    let body = req.body;

    // si req.body est vide (ça arrive selon le runtime), on lit le flux
    if (!body || typeof body !== "object") {
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => (data += chunk));
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = raw ? JSON.parse(raw) : {};
    }

    // Honeypot anti-bot
    if (body.website && body.website.trim() !== "") {
      return res.status(200).json({ ok: true, skipped: "honeypot" });
    }

    // --- Vérif variables d'env ---
    const apiKey = process.env.RESEND_API;
    const from = process.env.RESEND_FROM; // ex: "LC Création <leads@lc-creation.be>"
    const to = process.env.RESEND_TO;     // ex: "lecocqcedric@outlook.be"

    if (!apiKey || !from || !to) {
      throw new Error("Missing env vars: RESEND_API / RESEND_FROM / RESEND_TO");
    }

    // --- Construire le mail ---
    const {
      prenom, nom, emailClient, tel, message, codePostal,
      terrain, typeProjet, pack, budgetText,
      chauffageTxt, traitementTxt, couvertureTxt, entretienTxt, loisirsTxt,
      delaiTxt, contactPrefTxt, estimationText,
      evacChoice, evacM3, plageMateriau, plageSurface
    } = body;

    const text = [
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
      Taille : ${taille}

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

    const subject = `Demande estimation piscine bois – ${prenom || ""} ${nom || ""}`.trim();

    // --- Appel Resend API ---
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text
      })
    });

    const json = await r.json();

    if (!r.ok) {
      // Resend renvoie un JSON d'erreur clair
      throw new Error(json?.message || JSON.stringify(json));
    }

    return res.status(200).json({ ok: true, id: json.id });
  } catch (err) {
    console.error("send-lead error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
