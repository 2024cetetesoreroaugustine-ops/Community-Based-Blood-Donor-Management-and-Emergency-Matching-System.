<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = get_action();

if ($method === 'GET') {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if ($userId <= 0) {
        json_response(false, 'user_id is required.', null, 400);
    }

    $stmt = $pdo->prepare("SELECT NotificationID, Message, SentDate, status, linked_req_id, donor_id
        FROM NOTIFICATION
        WHERE USERS_UserID = ? AND status <> 'Dismissed'
        ORDER BY NotificationID DESC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    json_response(true, 'Notifications fetched.', $rows);
}

if ($method === 'PUT') {
    $body = read_json_body();

    if ($action === 'dispatch') {
        $message = str_val($body, 'Message');
        $donorUserId = int_val_or_null($body, 'donor_user_id');
        $reqId = int_val_or_null($body, 'REQ_id');
        $donorId = int_val_or_null($body, 'donor_id');

        if ($message === '' || !$donorUserId) {
            json_response(false, 'Message and donor_user_id are required.', null, 400);
        }

        $stmt = $pdo->prepare("INSERT INTO NOTIFICATION
            (Message, SentDate, USERS_UserID, status, linked_req_id, donor_id)
            VALUES (?, CURDATE(), ?, 'Unread', ?, ?)");
        $stmt->execute([$message, $donorUserId, $reqId, $donorId]);

        json_response(true, 'Notification dispatched to donor.', [
            'NotificationID' => (int)$pdo->lastInsertId(),
        ]);
    }

    if ($action === 'respond') {
        $donorId = int_val_or_null($body, 'donor_id');
        $donorUserId = int_val_or_null($body, 'donor_user_id');
        $reqId = int_val_or_null($body, 'REQ_id');
        $choice = str_val($body, 'choice');
        $hospitalUserId = int_val_or_null($body, 'hospital_user_id');
        $hospitalMessage = str_val($body, 'hospital_message');

        if (!$donorId || !$donorUserId || !in_array($choice, ['Accepted', 'Declined'], true)) {
            json_response(false, 'Invalid notification response payload.', null, 400);
        }

        $pdo->beginTransaction();
        try {
            if ($reqId) {
                $updNotif = $pdo->prepare("UPDATE NOTIFICATION
                    SET status = 'Responded'
                    WHERE USERS_UserID = ? AND linked_req_id = ?");
                $updNotif->execute([$donorUserId, $reqId]);
            }

            if ($choice === 'Accepted') {
                $updDonor = $pdo->prepare("UPDATE Volunteer_Blood_donor
                    SET AVB_STU = 'Reserved / Donating'
                    WHERE donor_id = ?");
                $updDonor->execute([$donorId]);

                if ($reqId) {
                    $insMatch = $pdo->prepare("INSERT INTO donor_Match
                        (RSO, RSO_DTE, donation_STU, EMG_Blood_REQ_REQ_id, Volunteer_Blood_donor_donor_id)
                        VALUES ('Accepted', CURDATE(), 'Pending Confirmation', ?, ?)");
                    $insMatch->execute([$reqId, $donorId]);
                }

                if ($hospitalUserId && $hospitalMessage !== '') {
                    $insHospNotif = $pdo->prepare("INSERT INTO NOTIFICATION
                        (Message, SentDate, USERS_UserID, status, linked_req_id, donor_id)
                        VALUES (?, CURDATE(), ?, 'Unread', ?, ?)");
                    $insHospNotif->execute([$hospitalMessage, $hospitalUserId, $reqId, $donorId]);
                }
            } else {
                if ($hospitalUserId && $reqId) {
                    $insHospNotif = $pdo->prepare("INSERT INTO NOTIFICATION
                        (Message, SentDate, USERS_UserID, status, linked_req_id, donor_id)
                        VALUES (?, CURDATE(), ?, 'Unread', ?, ?)");
                    $insHospNotif->execute([
                        "Donor declined emergency request #{$reqId}.",
                        $hospitalUserId,
                        $reqId,
                        $donorId,
                    ]);
                }
            }

            $pdo->commit();
            json_response(true, 'Notification response processed.', ['choice' => $choice]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_response(false, $e->getMessage(), null, 400);
        }
    }

    if ($action === 'dismiss') {
        $notificationId = int_val_or_null($body, 'NotificationID');
        if (!$notificationId) {
            json_response(false, 'NotificationID is required.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE NOTIFICATION SET status = 'Dismissed' WHERE NotificationID = ?");
        $stmt->execute([$notificationId]);

        json_response(true, 'Notification dismissed.', ['NotificationID' => $notificationId]);
    }

    json_response(false, 'Invalid notifications action.', null, 400);
}

json_response(false, 'Method not allowed.', null, 405);
