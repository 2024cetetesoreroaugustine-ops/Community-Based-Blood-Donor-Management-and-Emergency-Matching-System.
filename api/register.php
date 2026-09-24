// ADD THIS AT THE TOP WITH YOUR INCLUDES
require_once __DIR__ . '/../config/mailer.php';

// ... inside your registration transaction / user creation block:

// 1. Generate secure token
$verificationToken = bin2hex(random_bytes(32));

// 2. Modify your INSERT statement into USERS:
// Set active = 0, is_verified = 0, and save $verificationToken
$stmt = $pdo->prepare("
    INSERT INTO USERS (Username, Password, ROLES_RoleID, active, is_verified, verification_token) 
    VALUES (:username, :password, :role_id, 0, 0, :token)
");
$stmt->execute([
    ':username' => $username,
    ':password' => $hashedPassword,
    ':role_id'  => $roleId,
    ':token'    => $verificationToken
]);
$newUserId = $pdo->lastInsertId();

// ... execute your existing specific profile queries (Hospital_STF, Volunteer_Blood_donor, etc.) ...

// 3. Send Verification Email
try {
    $mail = getMailer();
    $mail->addAddress($recipientEmail, $recipientName);
    
    $mail->isHTML(true);
    $mail->Subject = 'Verify Your PulseLink Account Email';
    
    $verifyUrl = "http://localhost/pulselink/api/verify-email.php?token=" . $verificationToken;
    
    $mail->Body = "
        <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
            <h2 style='color: #8b0000;'>Welcome to PulseLink System</h2>
            <p>Hello <strong>" . htmlspecialchars($recipientName) . "</strong>,</p>
            <p>An account has been created for you. Please click the button below to verify your email address and activate your account:</p>
            <p style='margin: 25px 0;'>
                <a href='{$verifyUrl}' style='background-color: #8b0000; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Verify Email Address</a>
            </p>
            <p style='color: #666; font-size: 0.85rem;'>Or copy and paste this link into your browser:<br>{$verifyUrl}</p>
        </div>
    ";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Registration successful. A verification email has been sent."]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Account created, but activation email failed: " . $mail->ErrorInfo]);
}