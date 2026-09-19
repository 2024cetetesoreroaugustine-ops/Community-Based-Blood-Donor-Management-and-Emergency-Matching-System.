<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$stmt = $pdo->query('SELECT NOW() AS server_time');
$row = $stmt->fetch();

json_response(true, 'PulseLink PHP API is healthy.', [
    'server_time' => $row['server_time'] ?? null,
]);
