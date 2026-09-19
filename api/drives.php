<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $donorId = isset($_GET['donor_id']) ? (int)$_GET['donor_id'] : 0;
    if ($donorId <= 0) {
        json_response(false, 'donor_id is required.', null, 400);
    }

    $stmt = $pdo->prepare("SELECT p.ParticipationID,
            p.ParticipationStatus,
            p.Blood_Drive_Blood_Drive_id,
            p.Volunteer_Blood_donor_donor_id,
            d.EVT_name,
            d.LOC,
            d.SHD,
            d.STU
        FROM BLOOD_DRIVE_PAR p
        INNER JOIN Blood_Drive d ON d.Blood_Drive_id = p.Blood_Drive_Blood_Drive_id
        WHERE p.Volunteer_Blood_donor_donor_id = ?
        ORDER BY p.ParticipationID DESC");
    $stmt->execute([$donorId]);

    json_response(true, 'Drive participation records fetched.', $stmt->fetchAll());
}

if ($method === 'POST') {
    $body = read_json_body();

    $driveId = int_val_or_null($body, 'Blood_Drive_id');
    $donorId = int_val_or_null($body, 'donor_id');

    if (!$driveId || !$donorId) {
        json_response(false, 'Blood_Drive_id and donor_id are required.', null, 400);
    }

    $checkDrive = $pdo->prepare("SELECT STU FROM Blood_Drive WHERE Blood_Drive_id = ? LIMIT 1");
    $checkDrive->execute([$driveId]);
    $drive = $checkDrive->fetch();

    if (!$drive) {
        json_response(false, 'Blood drive not found.', null, 404);
    }

    if (in_array((string)$drive['STU'], ['Completed', 'Cancelled'], true)) {
        json_response(false, 'Cannot join completed or cancelled drives.', null, 400);
    }

    $checkDonor = $pdo->prepare("SELECT d.donor_id,
            COALESCE(v.VerificationStatus, 'Pending') AS verificationStatus
        FROM Volunteer_Blood_donor d
        LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
        WHERE d.donor_id = ? LIMIT 1");
    $checkDonor->execute([$donorId]);
    $donor = $checkDonor->fetch();

    if (!$donor) {
        json_response(false, 'Donor record not found.', null, 404);
    }

    if ((string)$donor['verificationStatus'] !== 'Verified') {
        json_response(false, 'Only verified donors can join blood drives.', null, 403);
    }

    $stmt = $pdo->prepare("INSERT IGNORE INTO BLOOD_DRIVE_PAR
        (ParticipationStatus, Blood_Drive_Blood_Drive_id, Volunteer_Blood_donor_donor_id)
        VALUES ('Joined', ?, ?)");
    $stmt->execute([$driveId, $donorId]);

    json_response(true, 'Drive participation recorded.', [
        'Blood_Drive_id' => $driveId,
        'donor_id' => $donorId,
    ]);
}

json_response(false, 'Method not allowed.', null, 405);
