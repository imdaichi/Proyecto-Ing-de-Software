<?php
// index.php (El Recepcionista)

// --- 1. CONFIGURACIÓN GLOBAL (CORS y Conexión) ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Incluimos la conexión a Firebase (que define $db)
require __DIR__.'/Config/firebase.php';

// --- 2. VARIABLES GLOBALES DE LA PETICIÓN ---
// Estas variables estarán disponibles en todos tus controladores
global $db, $metodo, $datos, $ruta;

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Arreglo para OPTIONS (petición "pre-vuelo" de CORS)
if ($metodo == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$ruta_completa = $_SERVER['REQUEST_URI'] ?? '/';
$ruta = strtok($ruta_completa, '?');
$datos = json_decode(file_get_contents('php://input'), true);

// --- 3. EL "ROUTER" (El recepcionista dirigiendo) ---
// Este switch ahora solo dirige, no contiene lógica.
switch ($ruta) {

    case '/api/productos':
        require __DIR__.'/Controladores/productos.php';
        break;

    case '/api/usuarios':
        require __DIR__.'/Controladores/usuarios.php';
        break;

    case '/api/login':
        require __DIR__.'/Controladores/login.php';
        break;

    default:
        header('Content-Type: application/json');
        echo json_encode(['mensaje' => 'Bienvenido a mi API. Ruta no encontrada.']);
        break;
}
?>