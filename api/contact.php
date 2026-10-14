<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$data = json_decode(file_get_contents('php://input'), true);

if(!$data){
    echo json_encode(['ok' => false, 'message' => 'Aucune donnée reçue.']);
    exit;
}

$nom = htmlspecialchars(trim($data['nom'] ?? ''));
$email = filter_var(trim($data['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$tel = htmlspecialchars(trim($data['tel'] ?? ''));
$sujet = htmlspecialchars(trim($data['sujet'] ?? 'Diagnostic 20€'));
$message = htmlspecialchars(trim($data['message'] ?? ''));

if(empty($nom) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($message)){
    echo json_encode(['ok' => false, 'message' => 'Champs manquants ou email invalide.']);
    exit;
}

// CONFIG A MODIFIER
$to = "ton-vrai-email@gmail.com"; // <-- REMPLACE PAR TON EMAIL
$fromDomain = "declic-informatique.fr"; // ton domaine
$from = "no-reply@{$fromDomain}";

$subject = "[Déclic Bourges] $sujet - $nom";

$body = "Nouvelle demande depuis declic-informatique.fr (Bourges)\n";
$body .= "----------------------------------------\n";
$body .= "Nom : $nom\n";
$body .= "Téléphone : $tel\n";
$body .= "Email : $email\n";
$body .= "Sujet : $sujet\n";
$body .= "Date : ".date('d/m/Y H:i')."\n";
$body .= "----------------------------------------\n\n";
$body .= "Message :\n$message\n\n";
$body .= "---\n";
$body .= "Envoyé depuis Bourges (18000) - 07 83 20 87 86\n";

$headers = "From: Déclic Informatique <{$from}>\r\n";
$headers .= "Reply-To: {$nom} <{$email}>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// 1. Envoi email
$mailSent = mail($to, $subject, $body, $headers);

// 2. Sauvegarde dans un fichier JSON (data/demandes.json)
$logDir = __DIR__ . '/data';
if(!is_dir($logDir)) mkdir($logDir, 0755, true);

$logFile = $logDir . '/demandes.json';
$entry = [
    'date' => date('c'),
    'nom' => $nom,
    'tel' => $tel,
    'email' => $email,
    'sujet' => $sujet,
    'message' => $message,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
];

$existing = [];
if(file_exists($logFile)){
    $content = file_get_contents($logFile);
    $existing = json_decode($content, true) ?: [];
}
$existing[] = $entry;
file_put_contents($logFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

if($mailSent){
    echo json_encode(['ok' => true]);
} else {
    // Même si le mail échoue, on a le fichier
    echo json_encode(['ok' => true, 'warning' => 'Mail non envoyé mais demande sauvegardée']);
}
?>
