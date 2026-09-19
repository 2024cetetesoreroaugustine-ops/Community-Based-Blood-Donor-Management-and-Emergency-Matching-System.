<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $hospitalId = isset($_GET['hospital_id']) ? (int)$_GET['hospital_id'] : null;

    $sql = "SELECT r.*, bt.BloodTypeName,
            h.BARANGAY_BarangayID AS hospital_barangay_id,
            b.BarangayName AS hospital_barangay,
            h.USERS_UserID AS hospital_user_id
        FROM EMG_Blood_REQ r
        LEFT JOIN BLOOD_TYPE bt ON bt.BloodTypeID = r.BLOOD_TYPE_BloodTypeID
        LEFT JOIN Hospital_STF h ON h.Hospital_id = r.Hospital_STF_Hospital_id
        LEFT JOIN BARANGAY b ON b.BarangayID = h.BARANGAY_BarangayID";

    $params = [];
    if ($hospitalId) {
        $sql .= " WHERE r.Hospital_STF_Hospital_id = ?";
        $params[] = $hospitalId;
    }

    $sql .= " ORDER BY r.REQ_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    json_response(true, 'Emergency requests fetched.', $rows);
}

if ($method === 'POST') {
    $body = read_json_body();

    $patientName = str_val($body, 'patient_name');
    $qty = int_val_or_null($body, 'QTY_NDD') ?? 0;
    $reqDate = str_val($body, 'REQ_DTE');
    $bloodTypeId = int_val_or_null($body, 'BLOOD_TYPE_BloodTypeID') ?? 0;
    $hospitalId = int_val_or_null($body, 'Hospital_STF_Hospital_id') ?? 0;

    if ($patientName === '' || $qty < 1 || $reqDate === '' || !$bloodTypeId || !$hospitalId) {
        json_response(false, 'Incomplete emergency request payload.', null, 400);
    }

    if ($qty > 100) {
        json_response(false, 'Quantity cannot exceed 100 blood bags.', null, 400);
    }

    if (!is_not_past_date($reqDate)) {
        json_response(false, 'Request date cannot be in the past.', null, 400);
    }

    $hStmt = $pdo->prepare("SELECT BARANGAY_BarangayID, USERS_UserID FROM Hospital_STF WHERE Hospital_id = ? LIMIT 1");
    $hStmt->execute([$hospitalId]);
    $hospital = $hStmt->fetch();

    if (!$hospital) {
        json_response(false, 'Hospital record not found.', null, 404);
    }

    $barangayId = (int)$hospital['BARANGAY_BarangayID'];
    $hospitalUserId = (int)$hospital['USERS_UserID'];

    $matchStmt = $pdo->prepare("SELECT COUNT(*) AS total
        FROM Volunteer_Blood_donor d
        LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
        WHERE COALESCE(v.VerificationStatus, 'Pending') = 'Verified'
          AND d.AVB_STU = 'Available'
          AND d.BLOOD_TYPE_BloodTypeID = ?
          AND d.BARANGAY_BarangayID = ?");
    $matchStmt->execute([$bloodTypeId, $barangayId]);
    $qualifiedCount = (int)($matchStmt->fetch()['total'] ?? 0);

    $status = $qualifiedCount > 0 ? 'Matching Active' : 'No Match Found';

    $ins = $pdo->prepare("INSERT INTO EMG_Blood_REQ (
        patient_name, QTY_NDD, REQ_DTE, REQ_STU,
        BLOOD_TYPE_BloodTypeID, Hospital_STF_Hospital_id
    ) VALUES (?, ?, ?, ?, ?, ?)");
    $ins->execute([
        $patientName,
        $qty,
        $reqDate,
        $status,
        $bloodTypeId,
        $hospitalId,
    ]);

    $reqId = (int)$pdo->lastInsertId();

    if ($qualifiedCount === 0) {
        $ntf = $pdo->prepare("INSERT INTO NOTIFICATION
            (Message, SentDate, USERS_UserID, status, linked_req_id)
            VALUES (?, CURDATE(), ?, 'Unread', ?)");
        $ntf->execute([
            "No qualified donor found for Request #{$reqId}. Please broaden location or request additional support.",
            $hospitalUserId,
            $reqId,
        ]);
    }

    json_response(true, 'Emergency request submitted.', [
        'REQ_id' => $reqId,
        'qualified_count' => $qualifiedCount,
    ]);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $action = get_action();

    if ($action === 'update') {
        $reqId = int_val_or_null($body, 'REQ_id');
        $patientName = str_val($body, 'patient_name');
        $qty = int_val_or_null($body, 'QTY_NDD') ?? 0;
        $reqDate = str_val($body, 'REQ_DTE');
        $status = str_val($body, 'REQ_STU', 'Matching Active');

        if (!$reqId || $patientName === '' || $qty < 1 || !is_not_past_date($reqDate)) {
            json_response(false, 'Invalid request update payload.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE EMG_Blood_REQ
            SET patient_name = ?, QTY_NDD = ?, REQ_DTE = ?, REQ_STU = ?
            WHERE REQ_id = ?");
        $stmt->execute([$patientName, $qty, $reqDate, $status, $reqId]);

        json_response(true, 'Emergency request updated.', ['REQ_id' => $reqId]);
    }

    if ($action === 'delete') {
        $reqId = int_val_or_null($body, 'REQ_id');
        if (!$reqId) {
            json_response(false, 'REQ_id is required.', null, 400);
        }

        $stmt = $pdo->prepare("DELETE FROM EMG_Blood_REQ WHERE REQ_id = ?");
        $stmt->execute([$reqId]);

        json_response(true, 'Emergency request deleted.', ['REQ_id' => $reqId]);
    }

    json_response(false, 'Invalid requests action.', null, 400);
}

json_response(false, 'Method not allowed.', null, 405);
