<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}


require_once __DIR__ . '/Config/db.php'; 


$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$ruta = preg_replace('#^/api#', '', $ruta); 
$ruta = preg_replace('#^/Backend#', '', $ruta); 
$metodo = $_SERVER['REQUEST_METHOD'];
$datos = json_decode(file_get_contents('php://input'), true) ?? [];

$ruta_limpia = trim($ruta, '/');
$partes = explode('/', $ruta_limpia);
$entidad = $partes[0] ?? ''; 

switch ($entidad) {
    case 'productos':   require __DIR__ . '/Productos.php'; break;
    case 'ventas':      require __DIR__ . '/Ventas.php'; break;
    case 'usuarios':    require __DIR__ . '/Usuarios.php'; break;
    case 'reportes':    require __DIR__ . '/Reportes.php'; break;
    case 'movimientos': require __DIR__ . '/Movimientos.php'; break;
    case 'proveedores': require __DIR__ . '/Proveedores.php'; break;
    case 'login':       require __DIR__ . '/Login.php'; break;
    case 'importar':    require __DIR__ . '/ImportarCSV.php'; break;
    case 'notificaciones': require __DIR__ . '/Notificaciones.php'; break;

    default:
        if ($entidad === '' || $entidad === 'index.php') {
            echo json_encode(['mensaje' => 'API MySQL Online 🟢']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Ruta no encontrada: ' . $entidad]);
        }
        break;
}
?>