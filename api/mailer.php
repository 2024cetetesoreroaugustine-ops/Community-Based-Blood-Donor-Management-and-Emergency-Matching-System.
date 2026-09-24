<?php
// BloodDonorSystem/api/mailer.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Ang path ay pumupunta muna pabalik sa root folder para mahanap ang PHPMailer/
require_once __DIR__ . '/../PHPMailer/Exception.php';
require_once __DIR__ . '/../PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../PHPMailer/SMTP.php';

function getMailer() {
    $mail = new PHPMailer(true);
    
    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'pulselinksystem@gmail.com'; // Ilagay ang iyong Gmail
    $mail->Password   = 'eunz ordd xwmy noxv';    // 16-character App Password mula sa Google
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Sender identity
    $mail->setFrom('YOUR_GMAIL_ADDRESS@gmail.com', 'PulseLink Blood System');
    
    return $mail;
}