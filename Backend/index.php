<?php
// --- ¡LA SOLUCIÓN! (Manejar CORS y Preflight OPTIONS) ---

// 1. Permitir cualquier origen (frontend)
header("Access-Control-Allow-Origin: *");

// 2. Permitir los métodos que usaremos (GET para buscar, POST para login/actualizar)
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// 3. Permitir los headers que usaremos (para enviar JSON)
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// 4. ¡LA CLAVE! Si es una petición de "permiso" (OPTIONS),
//    solo envía los headers de arriba y detente.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); // Responde OK
    exit(); // Detiene el script aquí. No necesitamos cargar Firebase.
}
// --------------------------------------------------------


// --- Si no fue OPTIONS, entonces es una petición REAL ---

// 1. Cargar la base de datos de Firebase
require_once 'Config/firebase.php'; // $db ahora existe

// 2. Obtener los datos de la petición
$metodo = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$datos = json_decode(file_get_contents('php://input'), true);

// 3. Mini-Router (El Recepcionista)
switch ($uri) {
    case '/api/login':
        require 'Controladores/login.php';
        break;

    case '/api/productos':
        require 'Controladores/productos.php';
        break;

    // (Puedes añadir más rutas aquí en el futuro)

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Ruta no encontrada']);
        break;
}
?>