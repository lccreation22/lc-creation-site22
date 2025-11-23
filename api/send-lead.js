
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // On accepte uniquement le POST
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // Champs minimum
    if (!data.prenom || !data.nom || !data.emailClient) {
      return res.status(422).json({ ok: false, error: "Missing required fields" });
    }

    const subject = `Demande estimation piscine bois – ${data.prenom} ${data.nom}`;

    const lines = [
      "Nouvelle configuration piscine via le site LC Création",
      "",
      "Coordonnées client :",
      `Prénom : ${data.prenom}`,
      `Nom : ${data.nom}`,
      `E-mail : ${data.emailClient}`,
      `Téléphone : ${data.tel || "non renseigné"}`,
      "",
      "Localisation :",
      `Code postal / Ville : ${data.codePostal || "non renseigné"}`,
      `Terrain : ${data.terrain || "non renseigné"}`,
      "",
      "Projet :",
      `Type de projet : ${data.typeProjet || "non renseigné"}`,
      `Pack choisi : ${data.pack || "non renseigné"}`,
      data.budgetText || "",
      "",
      "Options :",
      data.chauffageTxt || "",
      data.traitementTxt || "",
      data.couvertureTxt || "",
      data.entretienTxt || "",
      data.loisirsTxt || "",
      "",
      data.delaiTxt || "",
      data.contactPrefTxt || "",
      "",
      `Estimation indicative affichée au client : ${data.estimationText || "–"} TVAC`,
      "",
      "Message du client :",
      data.message || "(aucun message complémentaire)"
    ];

    console.log("SEND-LEAD payload:", data);
    console.log("RESEND_API_KEY présent ?", !!process.env.RESEND_API_KEY);

    const emailResponse = await resend.emails.send({
      from: "LC Création <contact@lc-creation.be>",  // doit être sur un domaine vérifié chez Resend
      to: "lecocqcedric@outlook.be",
      replyTo: data.emailClient,
      subject,
      text: lines.join("\n")
    });

    console.log("Resend response:", emailResponse);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND-LEAD error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}


