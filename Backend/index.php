<?php
// Backend/index.php

// --- MODO DEBUG ACTIVADO ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ... (El resto del código sigue igual abajo) ...
// Backend/index.php


// --- MODO DEBUG (Desactívalo en producción) ---
ini_set('display_errors', 0); // Lo ponemos en 0 para no romper el JSON con warnings
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// 1. HEADERS CORS (Obligatorios)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Manejo de preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

// 2. CONEXIÓN MYSQL
require_once __DIR__ . '/Config/db.php'; 

// 3. PROCESAMIENTO URL
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$ruta = preg_replace('#^/api#', '', $ruta); // Quita /api si existe
$ruta = preg_replace('#^/Backend#', '', $ruta); // Quita /Backend si existe (ajuste para XAMPP)
$metodo = $_SERVER['REQUEST_METHOD'];
$datos = json_decode(file_get_contents('php://input'), true) ?? [];

$ruta_limpia = trim($ruta, '/');
$partes = explode('/', $ruta_limpia);
$entidad = $partes[0] ?? ''; 

// 4. RUTEO
switch ($entidad) {
    case 'productos':   require __DIR__ . '/Productos.php'; break;
    case 'ventas':      require __DIR__ . '/Ventas.php'; break;
    case 'usuarios':    require __DIR__ . '/Usuarios.php'; break;
    case 'reportes':    require __DIR__ . '/Reportes.php'; break;
    case 'movimientos': require __DIR__ . '/Movimientos.php'; break;
    case 'proveedores': require __DIR__ . '/Proveedores.php'; break;
    case 'login':       require __DIR__ . '/Login.php'; break;
    case 'importar':    require __DIR__ . '/ImportarCSV.php'; break;

    default:
        // Si entras a la raíz, no da error, solo saluda
        if ($entidad === '' || $entidad === 'index.php') {
            echo json_encode(['mensaje' => 'API MySQL Online 🟢']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada: ' . $entidad]);
        }
        break;
}
?>