<?php
// Archivo: ArchivarMovimientos.php
// Exporta movimientos con más de 30 días a CSV y los elimina de la tabla

require_once __DIR__ . '/Config/db.php';
require_once __DIR__ . '/ArchivarMovimientosService.php';

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'CLI';

// Solo enviamos header JSON en contexto web
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

if (!isset($pdo) && isset($db)) { $pdo = $db; }
if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(['error' => 'No hay conexión a BD']);
    exit;
}

if ($metodo !== 'POST' && $metodo !== 'CLI') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    $result = archivarMovimientosService($pdo, 30);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
