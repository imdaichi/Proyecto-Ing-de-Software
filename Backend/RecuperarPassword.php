<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/Config/db.php';

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$emailUsuario = $input['email_usuario'] ?? '';
$passwordAdmin = $input['password_admin'] ?? '';
$nuevaPassword = $input['nueva_password'] ?? '';

// Validar datos
if (empty($emailUsuario) || empty($passwordAdmin) || empty($nuevaPassword)) {
    http_response_code(400);
    echo json_encode(['error' => 'Todos los campos son requeridos']);
    exit;
}

if (strlen($nuevaPassword) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
    exit;
}

try {
    // 1. Verificar que existe un administrador con esa contraseña
    $stmt = $pdo->prepare("SELECT id, password FROM usuarios WHERE rol = 'admin'");
    $stmt->execute();
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $adminValido = false;
    foreach ($admins as $admin) {
        // Soportar contraseñas en texto plano y hasheadas
        if ($admin['password'] === $passwordAdmin || password_verify($passwordAdmin, $admin['password'])) {
            $adminValido = true;
            break;
        }
    }
    
    if (!$adminValido) {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña de administrador incorrecta']);
        exit;
    }
    
    // 2. Verificar que el usuario existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
    $stmt->execute([$emailUsuario]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$usuario) {
        http_response_code(404);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }
    
    // 3. Actualizar la contraseña del usuario
    // Guardar en texto plano para ser consistente con el sistema actual
    $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE email = ?");
    $stmt->execute([$nuevaPassword, $emailUsuario]);
    
    echo json_encode([
        'exito' => true,
        'mensaje' => 'Contraseña actualizada correctamente'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]);
}
