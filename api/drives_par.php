<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Auto-release donors whose cooldown has ended.
$pdo->exec("UPDATE Volunteer_Blood_donor
    SET AVB_STU = 'Available',
        cooldown_until = NULL
    WHERE AVB_STU = 'Cooldown'
      AND cooldown_until IS NOT NULL
      AND cooldown_until <= CURDATE()");

if ($method === 'GET') {
    $donorId = isset($_GET['donor_id']) ? (int)$_GET['donor_id'] : 0;
    if ($donorId <= 0) {
        json_response(false, 'donor_id is required.', null, 400);
    }

    $stmt = $pdo->prepare("SELECT
            p.ParticipationID,
            p.ParticipationStatus,
            p.Blood_Drive_Blood_Drive_id,
            p.Volunteer_Blood_donor_donor_id,
            bd.EVT_name,
            bd.LOC,
            bd.SHD,
            bd.STU,
            b.BarangayName
        FROM BLOOD_DRIVE_PAR p
        INNER JOIN Blood_Drive bd ON bd.Blood_Drive_id = p.Blood_Drive_Blood_Drive_id
        LEFT JOIN BARANGAY b ON b.BarangayID = bd.BARANGAY_BarangayID
        WHERE p.Volunteer_Blood_donor_donor_id = ?
        ORDER BY p.ParticipationID DESC");
    $stmt->execute([$donorId]);
    $rows = $stmt->fetchAll();

    json_response(true, 'Blood drive participation fetched.', $rows);
}

if ($method === 'POST') {
    $body = read_json_body();

    $driveId = int_val_or_null($body, 'Blood_Drive_id');
    $donorId = int_val_or_null($body, 'donor_id');

    if (!$driveId || !$donorId) {
        json_response(false, 'Blood_Drive_id and donor_id are required.', null, 400);
    }

    $donorStmt = $pdo->prepare("SELECT
            d.donor_id,
            d.AVB_STU,
            d.cooldown_until,
            COALESCE(v.VerificationStatus, 'Pending') AS verificationStatus
        FROM Volunteer_Blood_donor d
        LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
        WHERE d.donor_id = ?
        LIMIT 1");
    $donorStmt->execute([$donorId]);
    $donor = $donorStmt->fetch();

    if (!$donor) {
        json_response(false, 'Donor record not found.', null, 404);
    }

    if ((string)$donor['verificationStatus'] !== 'Verified') {
        json_response(false, 'Only verified donors can join blood drives.', null, 403);
    }

    if ((string)$donor['AVB_STU'] === 'Reserved / Donating') {
        json_response(false, 'You cannot join while Reserved / Donating.', null, 403);
    }

    if ((string)$donor['AVB_STU'] === 'Cooldown') {
        $until = $donor['cooldown_until'] ?? null;
        if ($until && $until > date('Y-m-d')) {
            json_response(false, "You are on cooldown until {$until}.", null, 403);
        }
    }

    $driveStmt = $pdo->prepare("SELECT Blood_Drive_id, STU
        FROM Blood_Drive
        WHERE Blood_Drive_id = ?
        LIMIT 1");
    $driveStmt->execute([$driveId]);
    $drive = $driveStmt->fetch();

    if (!$drive) {
        json_response(false, 'Blood drive not found.', null, 404);
    }

    if (in_array((string)$drive['STU'], ['Completed', 'Cancelled'], true)) {
        json_response(false, 'This blood drive is no longer accepting participants.', null, 400);
    }

    $dupStmt = $pdo->prepare("SELECT ParticipationID
        FROM BLOOD_DRIVE_PAR
        WHERE Blood_Drive_Blood_Drive_id = ? AND Volunteer_Blood_donor_donor_id = ?
        LIMIT 1");
    $dupStmt->execute([$driveId, $donorId]);
    if ($dupStmt->fetch()) {
        json_response(false, 'You have already joined this blood drive.', null, 409);
    }

    $ins = $pdo->prepare("INSERT INTO BLOOD_DRIVE_PAR
        (ParticipationStatus, Blood_Drive_Blood_Drive_id, Volunteer_Blood_donor_donor_id)
        VALUES ('Joined', ?, ?)");
    $ins->execute([$driveId, $donorId]);

    json_response(true, 'Successfully joined blood drive.', [
        'ParticipationID' => (int)$pdo->lastInsertId(),
        'Blood_Drive_id' => $driveId,
        'donor_id' => $donorId,
    ]);
}

if ($method === 'PUT') {
    $action = get_action();
    $body = read_json_body();

    if ($action === 'cancel') {
        $driveId = int_val_or_null($body, 'Blood_Drive_id');
        $donorId = int_val_or_null($body, 'donor_id');

        if (!$driveId || !$donorId) {
            json_response(false, 'Blood_Drive_id and donor_id are required.', null, 400);
        }

        // Ensure participant record exists
        $check = $pdo->prepare("SELECT ParticipationID
            FROM BLOOD_DRIVE_PAR
            WHERE Blood_Drive_Blood_Drive_id = ? AND Volunteer_Blood_donor_donor_id = ?
            LIMIT 1");
        $check->execute([$driveId, $donorId]);
        $row = $check->fetch();

        if (!$row) {
            json_response(false, 'You are not joined in this blood drive.', null, 404);
        }

        // Optional safety: prevent cancel when drive already Completed/Cancelled
        $driveStmt = $pdo->prepare("SELECT STU FROM Blood_Drive WHERE Blood_Drive_id = ? LIMIT 1");
        $driveStmt->execute([$driveId]);
        $drive = $driveStmt->fetch();

        if ($drive && in_array((string)$drive['STU'], ['Completed', 'Cancelled'], true)) {
            json_response(false, 'Cannot cancel participation for completed/cancelled drives.', null, 400);
        }

        $del = $pdo->prepare("DELETE FROM BLOOD_DRIVE_PAR
            WHERE Blood_Drive_Blood_Drive_id = ? AND Volunteer_Blood_donor_donor_id = ?");
        $del->execute([$driveId, $donorId]);

        json_response(true, 'Blood drive participation cancelled.', [
            'Blood_Drive_id' => $driveId,
            'donor_id' => $donorId
        ]);
    }

    json_response(false, 'Invalid drives_par action.', null, 400);
}

json_response(false, 'Method not allowed.', null, 405);