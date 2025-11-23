<?php
// send-lead.php
header("Content-Type: application/json; charset=UTF-8");

// Sécurité basique : n'accepter que POST JSON
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "Method not allowed"]);
  exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!$data || !is_array($data)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid JSON"]);
  exit;
}

// Petite protection anti-bot (honeypot)
if (!empty($data["website"])) { // champ caché côté JS si tu veux
  http_response_code(200);
  echo json_encode(["ok" => true]);
  exit;
}

// Helpers
function clean($v) {
  $v = is_string($v) ? trim($v) : $v;
  return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

$prenom = clean($data["prenom"] ?? "");
$nom = clean($data["nom"] ?? "");
$emailClient = clean($data["emailClient"] ?? "");
$tel = clean($data["tel"] ?? "");
$message = clean($data["message"] ?? "");
$estimationText = clean($data["estimationText"] ?? "—");

// Validation mini
if ($prenom === "" || $nom === "" || $emailClient === "") {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "Missing required fields"]);
  exit;
}

if (!filter_var($emailClient, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "Invalid email"]);
  exit;
}

// Destinataire
$to = "lecocqcedric@outlook.be";

// Sujet
$subject = "Demande estimation piscine bois – $prenom $nom";

// Corps mail lisible
$lines = [];
$lines[] = "Nouvelle configuration piscine via le site LC Création";
$lines[] = "";
foreach ($data as $k => $v) {
  if ($k === "website") continue; // ignore honeypot
  $lines[] = strtoupper($k) . " : " . clean($v);
}
$body = implode("\n", $lines);

// Headers propres (important pour OVH)
$from = "site@lc-creation.be";  // mets une adresse de ton domaine
$headers  = "From: LC Création <$from>\r\n";
$headers .= "Reply-To: $emailClient\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// Envoi
$sent = mail($to, $subject, $body, $headers);

if (!$sent) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Mail sending failed"]);
  exit;
}

echo json_encode(["ok" => true]);
