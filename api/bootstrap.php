<?php
// PulseLink API bootstrap (shared helpers)

declare(strict_types=1);

date_default_timezone_set('Asia/Manila');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function env_or(string $key, string $fallback): string
{
    $value = getenv($key);
    return ($value !== false && $value !== '') ? $value : $fallback;
}

function json_response(bool $success, string $message = '', $data = null, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ]);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(false, 'Invalid JSON payload.', null, 400);
    }

    return $decoded;
}

function require_method(array $allowed): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, $allowed, true)) {
        json_response(false, 'Method not allowed.', null, 405);
    }
}

function get_action(): string
{
    return trim((string)($_GET['action'] ?? ''));
}

function str_val(array $arr, string $key, string $fallback = ''): string
{
    $val = $arr[$key] ?? $fallback;
    return trim((string)$val);
}

function int_val_or_null(array $arr, string $key): ?int
{
    if (!isset($arr[$key]) || $arr[$key] === '') {
        return null;
    }
    if (!is_numeric($arr[$key])) {
        return null;
    }
    return (int)$arr[$key];
}

function is_valid_username(string $value): bool
{
    return (bool)preg_match('/^[A-Z][a-zA-Z0-9_]{2,29}$/', $value);
}

function is_valid_password(string $value): bool
{
    return strlen($value) >= 8
        && preg_match('/[A-Z]/', $value)
        && preg_match('/[a-z]/', $value)
        && preg_match('/[0-9]/', $value)
        && preg_match('/[\W_]/', $value);
}

function is_valid_phone_ph(string $value): bool
{
    return (bool)preg_match('/^(\+63[0-9]{10}|09[0-9]{9})$/', $value);
}

function is_valid_gmail(string $value): bool
{
    if ($value === '') {
        return true;
    }
    return (bool)preg_match('/^[a-zA-Z0-9._%+\-]+@gmail\.com$/', $value);
}

function is_valid_name(string $value): bool
{
    return $value !== '' && !preg_match('/\d/', $value)
        && (bool)preg_match('/^[a-zA-ZÀ-ÿ\s\'\-]+$/u', $value);
}

function is_not_past_date(string $value): bool
{
    if ($value === '') {
        return false;
    }
    $today = date('Y-m-d');
    return $value >= $today;
}

function is_at_least_age(string $birthDate, int $minAge): bool
{
    if ($birthDate === '') {
        return false;
    }
    try {
        $b = new DateTime($birthDate);
        $now = new DateTime('now');
        $age = (int)$now->diff($b)->y;
        return $age >= $minAge;
    } catch (Throwable $e) {
        return false;
    }
}
