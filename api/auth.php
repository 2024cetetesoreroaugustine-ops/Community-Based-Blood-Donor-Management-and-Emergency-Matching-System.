<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$action = get_action();

if ($action === 'login') {
    require_method(['POST']);
    $body = read_json_body();

    $username = str_val($body, 'username');
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '') {
        json_response(false, 'Username and password are required.', null, 400);
    }

    $stmt = $pdo->prepare("SELECT UserID, Username, Password, ROLES_RoleID, active FROM USERS WHERE Username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string)$user['Password'])) {
        json_response(false, 'Invalid username or password.', null, 401);
    }

    if ((int)$user['active'] !== 1) {
        json_response(false, 'Account is deactivated. Please contact administrator.', null, 403);
    }

    $roleId = (int)$user['ROLES_RoleID'];
    $entityData = null;

    if ($roleId === 1) {
        $s = $pdo->prepare("SELECT admin_id, FIR_name, LST_name, USERS_UserID
            FROM CIT_Health_OFF_ADM
            WHERE USERS_UserID = ? LIMIT 1");
        $s->execute([(int)$user['UserID']]);
        $entityData = $s->fetch() ?: null;
    } elseif ($roleId === 2) {
        $s = $pdo->prepare("SELECT h.*, b.BarangayName
            FROM Hospital_STF h
            LEFT JOIN BARANGAY b ON b.BarangayID = h.BARANGAY_BarangayID
            WHERE h.USERS_UserID = ? LIMIT 1");
        $s->execute([(int)$user['UserID']]);
        $entityData = $s->fetch() ?: null;
    } elseif ($roleId === 3) {
        $s = $pdo->prepare("SELECT bhw.*, b.BarangayName
            FROM Barangay_Health_Worker bhw
            LEFT JOIN BARANGAY b ON b.BarangayID = bhw.BARANGAY_BarangayID
            WHERE bhw.USERS_UserID = ? LIMIT 1");
        $s->execute([(int)$user['UserID']]);
        $entityData = $s->fetch() ?: null;
    } elseif ($roleId === 4) {
        $s = $pdo->prepare("SELECT d.*, d.`ADD` AS ADD_col, bt.BloodTypeName, b.BarangayName,
                COALESCE(v.VerificationStatus, 'Pending') AS verificationStatus
            FROM Volunteer_Blood_donor d
            LEFT JOIN BLOOD_TYPE bt ON bt.BloodTypeID = d.BLOOD_TYPE_BloodTypeID
            LEFT JOIN BARANGAY b ON b.BarangayID = d.BARANGAY_BarangayID
            LEFT JOIN DONOR_VERIFICATION v ON v.Volunteer_Blood_donor_donor_id = d.donor_id
            WHERE d.USERS_UserID = ? LIMIT 1");
        $s->execute([(int)$user['UserID']]);
        $entityData = $s->fetch() ?: null;
    }

    json_response(true, 'Login successful.', [
        'UserID' => (int)$user['UserID'],
        'Username' => $user['Username'],
        'ROLES_RoleID' => $roleId,
        'entityData' => $entityData,
    ]);
}

if ($action === 'register') {
    require_method(['POST']);
    $body = read_json_body();

    $roleId = int_val_or_null($body, 'role_id');
    $username = str_val($body, 'username');
    $password = (string)($body['password'] ?? '');
    $creatorUserId = int_val_or_null($body, 'creator_user_id');

    if (!$roleId || $username === '' || $password === '') {
        json_response(false, 'role_id, username and password are required.', null, 400);
    }

    if (!$creatorUserId) {
        json_response(false, 'Only Admin can create user accounts.', null, 403);
    }

    $creatorStmt = $pdo->prepare("SELECT UserID, ROLES_RoleID, active FROM USERS WHERE UserID = ? LIMIT 1");
    $creatorStmt->execute([$creatorUserId]);
    $creator = $creatorStmt->fetch();

    if (!$creator || (int)$creator['active'] !== 1 || (int)$creator['ROLES_RoleID'] !== 1) {
        json_response(false, 'Only Admin can create user accounts.', null, 403);
    }

    if (!is_valid_username($username)) {
        json_response(false, 'Invalid username format.', null, 400);
    }

    if (!is_valid_password($password)) {
        json_response(false, 'Password must be at least 8 chars with uppercase, lowercase, number, and special character.', null, 400);
    }

    $exists = $pdo->prepare("SELECT UserID FROM USERS WHERE Username = ? LIMIT 1");
    $exists->execute([$username]);
    if ($exists->fetch()) {
        json_response(false, 'Username already exists.', null, 409);
    }

    $pdo->beginTransaction();
    try {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insUser = $pdo->prepare("INSERT INTO USERS (Username, Password, ROLES_RoleID, active) VALUES (?, ?, ?, 1)");
        $insUser->execute([$username, $hash, $roleId]);
        $userId = (int)$pdo->lastInsertId();

        if ($roleId === 1) {
            $fir = str_val($body, 'FIR_name');
            $lst = str_val($body, 'LST_name');
            if (!is_valid_name($fir) || !is_valid_name($lst)) {
                throw new RuntimeException('Valid first and last name are required for CHO admin.');
            }
            $stmt = $pdo->prepare("INSERT INTO CIT_Health_OFF_ADM (FIR_name, LST_name, USERS_UserID) VALUES (?, ?, ?)");
            $stmt->execute([$fir, $lst, $userId]);
        } elseif ($roleId === 2) {
            $hospitalName = str_val($body, 'Hospital_name');
            $ctt = str_val($body, 'CTT_number');
            $add = str_val($body, 'ADD_col');
            $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
            if ($hospitalName === '' || !is_valid_phone_ph($ctt)) {
                throw new RuntimeException('Hospital name is required and contact number must be valid PH format.');
            }
            $stmt = $pdo->prepare("INSERT INTO Hospital_STF (Hospital_name, `ADD`, CTT_number, USERS_UserID, BARANGAY_BarangayID)
                VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$hospitalName, $add, $ctt, $userId, $barangayId]);
        } elseif ($roleId === 3) {
            $fir = str_val($body, 'FIR_name');
            $lst = str_val($body, 'LST_name');
            $ctt = str_val($body, 'CTT_number');
            $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
            if (!is_valid_name($fir) || !is_valid_name($lst) || !is_valid_phone_ph($ctt)) {
                throw new RuntimeException('BHW name/contact input is invalid.');
            }
            $stmt = $pdo->prepare("INSERT INTO Barangay_Health_Worker (FIR_name, LST_name, CTT_number, USERS_UserID, BARANGAY_BarangayID)
                VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$fir, $lst, $ctt, $userId, $barangayId]);
        } elseif ($roleId === 4) {
            $fir = str_val($body, 'FIR_name');
            $mid = str_val($body, 'MID_NAME');
            $lst = str_val($body, 'LST_name');
            $sex = str_val($body, 'SEX', 'Male');
            $bth = str_val($body, 'BTH_DTE');
            $phone = str_val($body, 'phone_number');
            $email = str_val($body, 'email');
            $add = str_val($body, 'ADD_col');
            $barangayId = int_val_or_null($body, 'BARANGAY_BarangayID') ?? 1;
            $bloodTypeId = int_val_or_null($body, 'BLOOD_TYPE_BloodTypeID') ?? 1;

            if (!is_valid_name($fir) || !is_valid_name($lst) || !is_valid_phone_ph($phone)
                || !is_at_least_age($bth, 17) || !is_valid_gmail($email)) {
                throw new RuntimeException('Donor registration has invalid field values.');
            }

            if ($mid !== '' && !is_valid_name($mid)) {
                throw new RuntimeException('Donor middle name format is invalid.');
            }

            if (!in_array($sex, ['Male', 'Female'], true)) {
                throw new RuntimeException('Invalid donor sex value.');
            }

            $stmt = $pdo->prepare("INSERT INTO Volunteer_Blood_donor (
                FIR_name, MID_NAME, LST_name, SEX, BTH_DTE, phone_number,
                email, `ADD`, AVB_STU, RGS_DTE, USERS_UserID,
                BARANGAY_BarangayID, BLOOD_TYPE_BloodTypeID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available', CURDATE(), ?, ?, ?)");
            $stmt->execute([
                $fir, $mid, $lst, $sex, $bth, $phone,
                $email, $add, $userId, $barangayId, $bloodTypeId,
            ]);
        } else {
            throw new RuntimeException('Unsupported role_id.');
        }

        $pdo->commit();
        json_response(true, 'Account registered successfully.', ['UserID' => $userId]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, $e->getMessage(), null, 400);
    }
}

json_response(false, 'Invalid auth action.', null, 400);
