<?php
// Indique au client que la réponse sera en JSON
header('Content-Type: application/json');

// Récupération des données envoyées via la méthode POST par fetch()
$data = json_decode(file_get_contents('php://input'), true);

if(!$data){
    echo json_encode(['ok' => false, 'message' => 'Aucune donnée reçue.']);
    exit;
}

// Nettoyage des variables pour la sécurité
$nom = htmlspecialchars(trim($data['nom'] ?? ''));
$email = htmlspecialchars(trim($data['email'] ?? ''));
$tel = htmlspecialchars(trim($data['tel'] ?? ''));
$sujet = htmlspecialchars(trim($data['sujet'] ?? ''));
$message = htmlspecialchars(trim($data['message'] ?? ''));

// Paramètres de l'email
$to = "ton-adresse@email.com"; // À REMPLACER PAR TON EMAIL
$subject = "Nouveau contact Site Web : $sujet";
$body = "Nom : $nom\n";
$body .= "Téléphone : $tel\n";
$body .= "Email : $email\n";
$body .= "Sujet : $sujet\n\n";
$body .= "Message :\n$message\n";

$headers = "From: no-reply@ton-site.fr\r\n";
$headers .= "Reply-To: $email\r\n";

// Envoi de l'email
// $mailSent = mail($to, $subject, $body, $headers);

// Pour l'instant, on simule que l'email est toujours envoyé avec succès
echo json_encode(['ok' => true]);
?>
