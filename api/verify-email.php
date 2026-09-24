<?php
require_once __DIR__ . '/bootstrap.php';

// Database fallback connection logic
if (!isset($pdo) || $pdo === null) {
    if (function_exists('getDb')) {
        $pdo = getDb();
    } elseif (function_exists('getDBConnection')) {
        $pdo = getDBConnection();
    } else {
        $host = '127.0.0.1';
        $db   = 'blood_donor'; // Siguraduhing tama ang DB name mo rito
        $user = 'root';
        $pass = 'Raf082705';
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $e) {
            die("Database Connection Error");
        }
    }
}

$token = $_GET['token'] ?? '';

// Helper Function para sa Render UI
function renderPage($status, $title, $message) {
    // I-FORCE ANG BROWSER NA MAG-RENDER NG HTML
    header('Content-Type: text/html; charset=utf-8');

    $isSuccess = ($status === 'success');
    $iconBg = $isSuccess ? '#e8f5e9' : '#ffebee';
    
    // SVG Icons
    $checkIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    $errorIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    $icon = $isSuccess ? $checkIcon : $errorIcon;

    echo "<!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>PulseLink - Email Verification</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #f4f6f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
            .card { background: #ffffff; width: 100%; max-width: 440px; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; }
            .icon-wrapper { width: 88px; height: 88px; background-color: {$iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            h1 { color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 12px; }
            p { color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
            .btn { display: inline-block; width: 100%; background-color: #8b0000; color: #ffffff; font-weight: 600; font-size: 16px; padding: 14px 20px; border-radius: 8px; text-decoration: none; transition: background-color 0.2s ease, transform 0.1s ease; }
            .btn:hover { background-color: #680000; }
            .btn:active { transform: scale(0.98); }
            .brand { margin-top: 24px; font-size: 13px; color: #94a3b8; font-weight: 500; }
        </style>
    </head>
    <body>
        <div class='card'>
            <div class='icon-wrapper'>
                {$icon}
            </div>
            <h1>{$title}</h1>
            <p>{$message}</p>
            <a href='http://localhost/BloodDonorSystem/' class='btn'>Back to Login Page</a>
            <div class='brand'>PulseLink Blood Donor System</div>
        </div>
    </body>
    </html>";
    exit;
}

if (empty($token)) {
    renderPage('error', 'Invalid Request', 'No verification token provided in the URL link.');
}

try {
    // Hanapin ang user gamit ang token
    $stmt = $pdo->prepare("SELECT UserID, is_verified FROM USERS WHERE verification_token = ? LIMIT 1");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        renderPage('error', 'Verification Failed', 'This email verification link is invalid or has already been used.');
    }

    // Update status to verified at active
    $updateStmt = $pdo->prepare("UPDATE USERS SET is_verified = 1, active = 1, verification_token = NULL WHERE UserID = ?");
    $updateStmt->execute([$user['UserID']]);

    renderPage('success', 'Email Verified!', 'Your email address has been successfully verified. You can now log in to your PulseLink account.');

} catch (Exception $e) {
    renderPage('error', 'System Error', 'An error occurred while verifying your email. Please try again later.');
}