<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$pdo = get_pdo();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = get_action();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT u.UserID, u.Username, u.ROLES_RoleID, u.active, r.RoleName
        FROM USERS u
        LEFT JOIN ROLES r ON r.RoleID = u.ROLES_RoleID
        ORDER BY u.UserID DESC");

    json_response(true, 'Users fetched.', $stmt->fetchAll());
}

if ($method === 'PUT') {
    $body = read_json_body();

    if ($action === 'update') {
        $userId = int_val_or_null($body, 'UserID');
        $username = str_val($body, 'Username');

        if (!$userId || $username === '') {
            json_response(false, 'UserID and Username are required.', null, 400);
        }

        if (!is_valid_username($username)) {
            json_response(false, 'Invalid username format.', null, 400);
        }

        $dup = $pdo->prepare("SELECT UserID FROM USERS WHERE Username = ? AND UserID <> ? LIMIT 1");
        $dup->execute([$username, $userId]);
        if ($dup->fetch()) {
            json_response(false, 'Username already in use by another account.', null, 409);
        }

        $stmt = $pdo->prepare("UPDATE USERS SET Username = ? WHERE UserID = ?");
        $stmt->execute([$username, $userId]);

        json_response(true, 'Username updated.', ['UserID' => $userId, 'Username' => $username]);
    }

    if ($action === 'toggle_status') {
        $userId = int_val_or_null($body, 'UserID');
        if (!$userId) {
            json_response(false, 'UserID is required.', null, 400);
        }

        $sel = $pdo->prepare("SELECT active FROM USERS WHERE UserID = ? LIMIT 1");
        $sel->execute([$userId]);
        $row = $sel->fetch();

        if (!$row) {
            json_response(false, 'User not found.', null, 404);
        }

        $newActive = ((int)$row['active'] === 1) ? 0 : 1;
        $upd = $pdo->prepare("UPDATE USERS SET active = ? WHERE UserID = ?");
        $upd->execute([$newActive, $userId]);

        json_response(true, 'User status updated.', ['UserID' => $userId, 'active' => $newActive]);
    }

    if ($action === 'delete') {
        $userId = int_val_or_null($body, 'UserID');
        $actorUserId = int_val_or_null($body, 'actor_user_id');

        if (!$userId || !$actorUserId) {
            json_response(false, 'UserID and actor_user_id are required.', null, 400);
        }

        if ($userId === $actorUserId) {
            json_response(false, 'You cannot delete your own active session account.', null, 400);
        }

        $actor = $pdo->prepare("SELECT ROLES_RoleID, active FROM USERS WHERE UserID = ? LIMIT 1");
        $actor->execute([$actorUserId]);
        $actorRow = $actor->fetch();
        if (!$actorRow || (int)$actorRow['active'] !== 1 || (int)$actorRow['ROLES_RoleID'] !== 1) {
            json_response(false, 'Only Admin can delete user accounts.', null, 403);
        }

        $stmt = $pdo->prepare("DELETE FROM USERS WHERE UserID = ?");
        $stmt->execute([$userId]);

        json_response(true, 'User account deleted.', ['UserID' => $userId]);
    }

    json_response(false, 'Invalid users action.', null, 400);
}

json_response(false, 'Method not allowed.', null, 405);
