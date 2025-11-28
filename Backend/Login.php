<?php
// ============================================
// LOGIN.PHP - Autenticación de Usuarios
// ============================================

// 1. Verificar conexión (viene desde index.php)
if (!isset($db)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno: No hay conexión a la base de datos']);
    exit;
}

// 2. Verificar que sea método POST
if ($metodo !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Usa POST.']);
    exit;
}

try {
    // 3. Obtener datos (Usamos $datos que viene decodificado desde index.php)
    $email = $datos['email'] ?? '';
    $password = $datos['password'] ?? ''; // En producción deberías usar hash!

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan datos (email o contraseña)']);
        exit;
    }

    // 4. Buscar usuario en Firebase por email
    // Nota: Firebase Firestore no busca usuarios de Auth, busca en tu colección 'usuarios'
    $usuariosRef = $db->collection('usuarios');
    $query = $usuariosRef->where('email', '==', $email);
    $documents = $query->documents();

    $usuarioEncontrado = null;

    foreach ($documents as $doc) {
        if ($doc->exists()) {
            $usuarioEncontrado = $doc->data();
            break; // Solo necesitamos el primero
        }
    }

    if (!$usuarioEncontrado) {
        // Por seguridad, no decimos si el email existe o no
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales incorrectas']);
        exit;
    }

    // 5. Verificar contraseña
    // IMPORTANTE: Si en tu BD las guardas como texto plano (solo para pruebas):
    if ($usuarioEncontrado['password'] === $password) {
        
        // ¡LOGIN EXITOSO!
        http_response_code(200);
        echo json_encode([
            'mensaje' => 'Login exitoso',
            'email' => $usuarioEncontrado['email'],
            'rol' => $usuarioEncontrado['rol'] ?? 'vendedor', // Enviamos el rol para el frontend
            'nombre' => $usuarioEncontrado['nombre'] ?? 'Usuario'
        ]);
        
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales incorrectas']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
}
?>