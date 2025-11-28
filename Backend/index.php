<?php
// --- MODO DEBUG: ACTIVAR ERRORES ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// -----------------------------------

// ... resto del código ...
// ============================================
// INDEX.PHP - ROUTER CENTRAL API (RESTFUL)
// ============================================

// 1. CARGA DE CONFIGURACIÓN
// Corregido para buscar en la carpeta Config
require_once __DIR__ . '/Config/firebase.php'; 

// 2. HEADERS CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Manejo de preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 3. PROCESAMIENTO DE LA URL
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$ruta = preg_replace('#^/api#', '', $ruta); // Si usas prefijo /api, lo quita
$metodo = $_SERVER['REQUEST_METHOD'];

// Leer datos JSON del body
$datos = json_decode(file_get_contents('php://input'), true) ?? [];

// Desglosamos la URL para detectar Entidad e ID
// Ejemplo: /productos/SKU-123  -> $entidad="productos", $id_url="SKU-123"
$ruta_limpia = trim($ruta, '/');
$partes = explode('/', $ruta_limpia);

$entidad = $partes[0] ?? ''; 
$id_url  = $partes[1] ?? null; // Aquí se guarda el SKU o ID si viene en la URL

// ============================================
// 4. RUTEO CENTRAL (SWITCH)
// ============================================

switch ($entidad) {
    case 'productos':
        $archivo = file_exists(__DIR__ . '/Productos.php') 
                   ? __DIR__ . '/Productos.php' 
                   : __DIR__ . '/Controladores/Productos.php';
        
        if (file_exists($archivo)) {
            require_once $archivo;
        } else {
            error_404('Archivo Productos.php no encontrado');
        }
        break;

    case 'ventas':
        $archivo = file_exists(__DIR__ . '/Ventas.php') 
                   ? __DIR__ . '/Ventas.php' 
                   : __DIR__ . '/Controladores/Ventas.php';
        
        if (file_exists($archivo)) {
            require_once $archivo;
        } else {
            error_404('Archivo Ventas.php no encontrado');
        }
        break;

    case 'usuarios':
        $archivo = file_exists(__DIR__ . '/Usuarios.php') 
                   ? __DIR__ . '/Usuarios.php' 
                   : __DIR__ . '/Controladores/Usuarios.php';
                   
        if (file_exists($archivo)) {
            require_once $archivo;
        } else {
            error_404('Archivo Usuarios.php no encontrado');
        }
        break;
        
    case 'reportes':
        $archivo = file_exists(__DIR__ . '/Reportes.php') 
                   ? __DIR__ . '/Reportes.php' 
                   : __DIR__ . '/Controladores/Reportes.php';
                   
        if (file_exists($archivo)) {
            require_once $archivo;
        } else {
            error_404('Archivo Reportes.php no encontrado');
        }
        break;

    case 'login':
        $archivo = file_exists(__DIR__ . '/Login.php') 
                   ? __DIR__ . '/Login.php' 
                   : __DIR__ . '/Controladores/Login.php';
                   
        if (file_exists($archivo)) {
            require_once $archivo;
        } else {
            error_404('Archivo Login.php no encontrado');
        }
        break;

    default:
        // Si entras a la raíz o ruta desconocida
        if ($entidad === '') {
            echo json_encode(['mensaje' => 'API Backend funcionando correctamente']);
        } else {
            error_404('Ruta no encontrada: ' . $entidad);
        }
        break;
}

// Función auxiliar para errores
function error_404($mensaje) {
    http_response_code(404);
    echo json_encode(['error' => $mensaje]);
}
?>