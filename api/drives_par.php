<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT bd.*, b.BarangayName
        FROM Blood_Drive bd
        LEFT JOIN BARANGAY b ON b.BarangayID = bd.BARANGAY_BarangayID
        ORDER BY bd.Blood_Drive_id DESC");

    json_response(true, 'Blood drives fetched.', $stmt->fetchAll());
}

if ($method === 'POST') {
    $body = read_json_body();

    $evt = str_val($body, 'EVT_name');
    $loc = str_val($body, 'LOC');
    $shd = str_val($body, 'SHD');
    $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
    $adminId = int_val_or_null($body, 'CIT_Health_OFF_ADM_admin_id');

    if ($evt === '' || $loc === '' || $shd === '') {
        json_response(false, 'Event name, location, and schedule are required.', null, 400);
    }

    if (!is_not_past_date($shd)) {
        json_response(false, 'Schedule date cannot be in the past.', null, 400);
    }

    $stmt = $pdo->prepare("INSERT INTO Blood_Drive
        (EVT_name, LOC, SHD, STU, BARANGAY_BarangayID, CIT_Health_OFF_ADM_admin_id)
        VALUES (?, ?, ?, 'Scheduled', ?, ?)");
    $stmt->execute([$evt, $loc, $shd, $barangayId, $adminId]);

    json_response(true, 'Blood drive created successfully.', [
        'Blood_Drive_id' => (int)$pdo->lastInsertId(),
    ]);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $action = get_action();

    if ($action === 'delete') {
        $id = int_val_or_null($body, 'Blood_Drive_id');
        if (!$id) {
            json_response(false, 'Blood_Drive_id is required.', null, 400);
        }

        $stmt = $pdo->prepare("DELETE FROM Blood_Drive WHERE Blood_Drive_id = ?");
        $stmt->execute([$id]);

        json_response(true, 'Blood drive deleted successfully.', ['Blood_Drive_id' => $id]);
    }

    $id = int_val_or_null($body, 'Blood_Drive_id');
    if (!$id) {
        json_response(false, 'Blood_Drive_id is required.', null, 400);
    }

    $evt = str_val($body, 'EVT_name');
    $loc = str_val($body, 'LOC');
    $shd = str_val($body, 'SHD');
    $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
    $stu = str_val($body, 'STU', 'Scheduled');

    if ($evt === '' || $loc === '' || $shd === '') {
        json_response(false, 'Event name, location, and schedule are required.', null, 400);
    }

    if (!is_not_past_date($shd)) {
        json_response(false, 'Schedule date cannot be in the past.', null, 400);
    }

    $stmt = $pdo->prepare("UPDATE Blood_Drive SET
        EVT_name = ?, LOC = ?, SHD = ?, BARANGAY_BarangayID = ?, STU = ?
        WHERE Blood_Drive_id = ?");
    $stmt->execute([$evt, $loc, $shd, $barangayId, $stu, $id]);

    json_response(true, 'Blood drive updated successfully.', ['Blood_Drive_id' => $id]);
}

json_response(false, 'Method not allowed.', null, 405);
