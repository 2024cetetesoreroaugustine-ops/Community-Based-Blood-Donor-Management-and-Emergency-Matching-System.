<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $hospitalId = isset($_GET['hospital_id']) ? (int)$_GET['hospital_id'] : null;

    $sql = "SELECT m.Match_id AS donation_id,
            m.EMG_Blood_REQ_REQ_id AS REQ_id,
            m.RSO_DTE AS don_date,
            m.donation_STU AS status,
            d.donor_id,
            CONCAT(d.FIR_name, ' ', d.LST_name) AS donor_name,
            d.BLOOD_TYPE_BloodTypeID,
            bt.BloodTypeName,
            r.Hospital_STF_Hospital_id AS hospital_id
        FROM donor_Match m
        LEFT JOIN Volunteer_Blood_donor d ON d.donor_id = m.Volunteer_Blood_donor_donor_id
        LEFT JOIN BLOOD_TYPE bt ON bt.BloodTypeID = d.BLOOD_TYPE_BloodTypeID
        LEFT JOIN EMG_Blood_REQ r ON r.REQ_id = m.EMG_Blood_REQ_REQ_id";

    $params = [];
    if ($hospitalId) {
        $sql .= " WHERE r.Hospital_STF_Hospital_id = ?";
        $params[] = $hospitalId;
    }

    $sql .= " ORDER BY m.Match_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    json_response(true, 'Donations fetched.', $rows);
}

if ($method === 'PUT') {
    $body = read_json_body();

    $donationId = int_val_or_null($body, 'donation_id');
    if (!$donationId) {
        json_response(false, 'donation_id is required.', null, 400);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT Volunteer_Blood_donor_donor_id, EMG_Blood_REQ_REQ_id
            FROM donor_Match WHERE Match_id = ? LIMIT 1");
        $stmt->execute([$donationId]);
        $donation = $stmt->fetch();

        if (!$donation) {
            throw new RuntimeException('Donation record not found.');
        }

        $updMatch = $pdo->prepare("UPDATE donor_Match
            SET donation_STU = 'Confirmed'
            WHERE Match_id = ?");
        $updMatch->execute([$donationId]);

        $updDonor = $pdo->prepare("UPDATE Volunteer_Blood_donor
            SET AVB_STU = 'Available'
            WHERE donor_id = ?");
        $updDonor->execute([(int)$donation['Volunteer_Blood_donor_donor_id']]);

        if (!empty($donation['EMG_Blood_REQ_REQ_id'])) {
            $updReq = $pdo->prepare("UPDATE EMG_Blood_REQ
                SET REQ_STU = 'Fulfilled'
                WHERE REQ_id = ?");
            $updReq->execute([(int)$donation['EMG_Blood_REQ_REQ_id']]);
        }

        $pdo->commit();
        json_response(true, 'Donation confirmed successfully.', [
            'donation_id' => $donationId,
            'status' => 'Confirmed',
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, $e->getMessage(), null, 400);
    }
}

json_response(false, 'Method not allowed.', null, 405);
