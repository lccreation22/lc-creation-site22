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

    if (!apiKey || !from || !to) {
      throw new Error("Missing env vars: RESEND_API / RESEND_FROM / RESEND_TO");
    }

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
      throw new Error(json?.message || JSON.stringify(json));
    }

    return res.status(200).json({ ok: true, id: json.id });
  } catch (err) {
    console.error("send-lead error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
