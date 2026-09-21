<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = get_action();

// Auto-release donors whose cooldown has ended.
$pdo->exec("UPDATE Volunteer_Blood_donor
    SET AVB_STU = 'Available',
        cooldown_until = NULL
    WHERE AVB_STU = 'Cooldown'
      AND cooldown_until IS NOT NULL
      AND cooldown_until <= CURDATE()");

if ($method === 'GET') {
    if ($action === 'match') {
        $bloodTypeId = isset($_GET['blood_type_id']) ? (int)$_GET['blood_type_id'] : null;
        $barangayId = isset($_GET['barangay_id']) ? (int)$_GET['barangay_id'] : null;

        $sql = "SELECT d.*, d.`ADD` AS ADD_col,
                bt.BloodTypeName,
                b.BarangayName,
                COALESCE(v.VerificationStatus, 'Pending') AS verificationStatus
            FROM Volunteer_Blood_donor d
            LEFT JOIN BLOOD_TYPE bt ON bt.BloodTypeID = d.BLOOD_TYPE_BloodTypeID
            LEFT JOIN BARANGAY b ON b.BarangayID = d.BARANGAY_BarangayID
            LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
            WHERE COALESCE(v.VerificationStatus, 'Pending') = 'Verified'
              AND d.AVB_STU = 'Available'";

        $params = [];
        if ($bloodTypeId) {
            $sql .= " AND d.BLOOD_TYPE_BloodTypeID = ?";
            $params[] = $bloodTypeId;
        }
        if ($barangayId) {
            $sql .= " AND d.BARANGAY_BarangayID = ?";
            $params[] = $barangayId;
        }
        $sql .= " ORDER BY d.donor_id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        json_response(true, 'Matched donors fetched.', $rows);
    }

    $stmt = $pdo->query("SELECT d.*, d.`ADD` AS ADD_col,
            bt.BloodTypeName,
            b.BarangayName,
            COALESCE(v.VerificationStatus, 'Pending') AS verificationStatus,
            v.VerificationDate
        FROM Volunteer_Blood_donor d
        LEFT JOIN BLOOD_TYPE bt ON bt.BloodTypeID = d.BLOOD_TYPE_BloodTypeID
        LEFT JOIN BARANGAY b ON b.BarangayID = d.BARANGAY_BarangayID
        LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
        ORDER BY d.donor_id DESC");
    $rows = $stmt->fetchAll();

    json_response(true, 'Donor list fetched.', $rows);
}

if ($method === 'POST') {
    if ($action !== 'bhw_register') {
        json_response(false, 'Invalid donor action for POST.', null, 400);
    }

    $body = read_json_body();

    $fir = str_val($body, 'FIR_name');
    $mid = str_val($body, 'MID_NAME');
    $lst = str_val($body, 'LST_name');
    $sex = str_val($body, 'SEX', 'Male');
    $bth = str_val($body, 'BTH_DTE');
    $phone = str_val($body, 'phone_number');
    $email = str_val($body, 'email');
    $add = str_val($body, 'ADD_col');
    $username = str_val($body, 'username');
    $password = (string)($body['password'] ?? '');
    $creatorUserId = int_val_or_null($body, 'creator_user_id');
    $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
    $bloodTypeId = int_val_or_null($body, 'BLOOD_TYPE_BloodTypeID') ?? 1;

    if ($fir === '' || $lst === '' || $bth === '' || $phone === '' || $username === '' || $password === '') {
        json_response(false, 'Missing required donor registration fields.', null, 400);
    }

    if (!is_valid_name($fir) || !is_valid_name($lst)) {
        json_response(false, 'Donor first/last name format is invalid.', null, 400);
    }

    if ($mid !== '' && !is_valid_name($mid)) {
        json_response(false, 'Donor middle name format is invalid.', null, 400);
    }

    if (!is_valid_username($username)) {
        json_response(false, 'Donor username format is invalid.', null, 400);
    }

    // Assisted donor registration uses temporary password.
    if (strlen($password) < 1) {
        json_response(false, 'Temporary password is required.', null, 400);
    }

    if (!is_valid_phone_ph($phone)) {
        json_response(false, 'Donor phone number format is invalid.', null, 400);
    }

    if (!is_valid_gmail($email)) {
        json_response(false, 'Donor email must be a valid @gmail.com address.', null, 400);
    }

    if (!is_at_least_age($bth, 17)) {
        json_response(false, 'Donor must be at least 17 years old.', null, 400);
    }

    if (!in_array($sex, ['Male', 'Female'], true)) {
        json_response(false, 'Invalid donor sex value.', null, 400);
    }

    if (!$creatorUserId) {
        json_response(false, 'Only BHW or Admin can assist donor registration.', null, 403);
    }

    $creatorStmt = $pdo->prepare("SELECT UserID, ROLES_RoleID, active FROM USERS WHERE UserID = ? LIMIT 1");
    $creatorStmt->execute([$creatorUserId]);
    $creator = $creatorStmt->fetch();

    if (!$creator || (int)$creator['active'] !== 1 || !in_array((int)$creator['ROLES_RoleID'], [1, 3], true)) {
        json_response(false, 'Only BHW or Admin can assist donor registration.', null, 403);
    }

    $exists = $pdo->prepare("SELECT UserID FROM USERS WHERE Username = ? LIMIT 1");
    $exists->execute([$username]);
    if ($exists->fetch()) {
        json_response(false, 'Username already exists.', null, 409);
    }

    $pdo->beginTransaction();
    try {
        $insUser = $pdo->prepare("INSERT INTO USERS
            (Username, Password, ROLES_RoleID, active, must_change_password, password_updated_at)
            VALUES (?, ?, 4, 1, 1, NULL)");
        $insUser->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
        $userId = (int)$pdo->lastInsertId();

        $insDonor = $pdo->prepare("INSERT INTO Volunteer_Blood_donor (
            FIR_name, MID_NAME, LST_name, SEX, BTH_DTE,
            phone_number, email, `ADD`, AVB_STU, cooldown_until, RGS_DTE,
            USERS_UserID, BARANGAY_BarangayID, BLOOD_TYPE_BloodTypeID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available', NULL, CURDATE(), ?, ?, ?)");
        $insDonor->execute([
            $fir, $mid, $lst, $sex, $bth,
            $phone, $email, $add,
            $userId, $barangayId, $bloodTypeId,
        ]);

        $donorId = (int)$pdo->lastInsertId();
        $pdo->commit();

        json_response(true, 'Donor registered successfully.', [
            'donor_id' => $donorId,
            'USERS_UserID' => $userId,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, $e->getMessage(), null, 400);
    }
}

if ($method === 'PUT') {
    $body = read_json_body();

    if ($action === 'verify') {
        $donorId = int_val_or_null($body, 'donor_id');
        $status = str_val($body, 'verificationStatus');
        $adminId = int_val_or_null($body, 'admin_id');

        if (!$donorId || !$adminId || !in_array($status, ['Verified', 'Rejected', 'Pending'], true)) {
            json_response(false, 'Invalid donor verification payload.', null, 400);
        }

        $check = $pdo->prepare("SELECT VerificationID FROM DONOR_VERIFICATION WHERE Volunteer_Blood_donor_donor_id = ? LIMIT 1");
        $check->execute([$donorId]);
        $row = $check->fetch();

        if ($row) {
            $upd = $pdo->prepare("UPDATE DONOR_VERIFICATION
                SET VerificationStatus = ?, VerificationDate = CURDATE(), CIT_Health_OFF_ADM_admin_id = ?
                WHERE Volunteer_Blood_donor_donor_id = ?");
            $upd->execute([$status, $adminId, $donorId]);
        } else {
            $ins = $pdo->prepare("INSERT INTO DONOR_VERIFICATION
                (VerificationStatus, VerificationDate, CIT_Health_OFF_ADM_admin_id, Volunteer_Blood_donor_donor_id)
                VALUES (?, CURDATE(), ?, ?)");
            $ins->execute([$status, $adminId, $donorId]);
        }

        json_response(true, 'Donor verification status updated.', ['donor_id' => $donorId]);
    }

    if ($action === 'update_profile') {
        $donorId = int_val_or_null($body, 'donor_id');
        if (!$donorId) {
            json_response(false, 'donor_id is required.', null, 400);
        }

        $fir = str_val($body, 'FIR_name');
        $mid = str_val($body, 'MID_NAME');
        $lst = str_val($body, 'LST_name');
        $phone = str_val($body, 'phone_number');
        $email = str_val($body, 'email');
        $username = str_val($body, 'Username');

        if (!is_valid_name($fir) || !is_valid_name($lst)) {
            json_response(false, 'Donor first/last name format is invalid.', null, 400);
        }
        if ($mid !== '' && !is_valid_name($mid)) {
            json_response(false, 'Donor middle name format is invalid.', null, 400);
        }
        if (!is_valid_phone_ph($phone)) {
            json_response(false, 'Donor phone number format is invalid.', null, 400);
        }
        if (!is_valid_gmail($email)) {
            json_response(false, 'Donor email must be a valid @gmail.com address.', null, 400);
        }

        // Get linked user for optional username update
        $linkStmt = $pdo->prepare("SELECT USERS_UserID FROM Volunteer_Blood_donor WHERE donor_id = ? LIMIT 1");
        $linkStmt->execute([$donorId]);
        $link = $linkStmt->fetch();

        if (!$link) {
            json_response(false, 'Donor record not found.', null, 404);
        }

        $linkedUserId = (int)$link['USERS_UserID'];

        if ($username !== '') {
            if (!is_valid_username($username)) {
                json_response(false, 'Invalid username format.', null, 400);
            }

            $dup = $pdo->prepare("SELECT UserID FROM USERS WHERE Username = ? AND UserID <> ? LIMIT 1");
            $dup->execute([$username, $linkedUserId]);
            if ($dup->fetch()) {
                json_response(false, 'Username already exists.', null, 409);
            }
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE Volunteer_Blood_donor SET
                FIR_name = ?, MID_NAME = ?, LST_name = ?,
                phone_number = ?, email = ?, `ADD` = ?, BARANGAY_BarangayID = ?
                WHERE donor_id = ?");
            $stmt->execute([
                $fir,
                $mid,
                $lst,
                $phone,
                $email,
                str_val($body, 'ADD_col'),
                int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1,
                $donorId,
            ]);

            if ($username !== '') {
                $updUser = $pdo->prepare("UPDATE USERS SET Username = ? WHERE UserID = ?");
                $updUser->execute([$username, $linkedUserId]);
            }

            $pdo->commit();
            json_response(true, 'Donor profile updated.', ['donor_id' => $donorId]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_response(false, $e->getMessage(), null, 400);
        }
    }

    if ($action === 'availability') {
        $donorId = int_val_or_null($body, 'donor_id');
        $avb = str_val($body, 'AVB_STU');

        if (!$donorId || $avb === '') {
            json_response(false, 'donor_id and AVB_STU are required.', null, 400);
        }

        if (!in_array($avb, ['Available', 'Not Available'], true)) {
            json_response(false, 'Invalid availability value.', null, 400);
        }

        $check = $pdo->prepare("SELECT AVB_STU, cooldown_until FROM Volunteer_Blood_donor WHERE donor_id = ? LIMIT 1");
        $check->execute([$donorId]);
        $current = $check->fetch();

        if (!$current) {
            json_response(false, 'Donor not found.', null, 404);
        }

        if ((string)$current['AVB_STU'] === 'Reserved / Donating') {
            json_response(false, 'Availability is locked during active donation.', null, 403);
        }

        if ((string)$current['AVB_STU'] === 'Cooldown') {
            $until = $current['cooldown_until'] ?? null;
            if ($until && $until > date('Y-m-d')) {
                json_response(false, "Availability is locked during cooldown until {$until}.", null, 403);
            }
        }

        $stmt = $pdo->prepare("UPDATE Volunteer_Blood_donor SET AVB_STU = ? WHERE donor_id = ?");
        $stmt->execute([$avb, $donorId]);

        json_response(true, 'Donor availability updated.', ['donor_id' => $donorId, 'AVB_STU' => $avb]);
    }

    if ($action === 'delete') {
        $donorId = int_val_or_null($body, 'donor_id');
        if (!$donorId) {
            json_response(false, 'donor_id is required.', null, 400);
        }

        $sel = $pdo->prepare("SELECT USERS_UserID FROM Volunteer_Blood_donor WHERE donor_id = ? LIMIT 1");
        $sel->execute([$donorId]);
        $row = $sel->fetch();
        if (!$row) {
            json_response(false, 'Donor record not found.', null, 404);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM Volunteer_Blood_donor WHERE donor_id = ?")->execute([$donorId]);
            $pdo->prepare("DELETE FROM USERS WHERE UserID = ?")->execute([(int)$row['USERS_UserID']]);
            $pdo->commit();
            json_response(true, 'Donor deleted successfully.', ['donor_id' => $donorId]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_response(false, $e->getMessage(), null, 400);
        }
    }

    json_response(false, 'Invalid donor action for PUT.', null, 400);
}

json_response(false, 'Method not allowed.', null, 405);