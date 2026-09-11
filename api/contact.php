<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
if(!$data){ echo json_encode(['ok'=>false]); exit; }
// TODO mail()
echo json_encode(['ok'=>true]);
?>
