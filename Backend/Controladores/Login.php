<?php
// Controladores/login.php

// Usamos las variables globales definidas en index.php
global $db, $metodo, $datos;

header('Content-Type: application/json');

if ($metodo == 'POST') {
    try {
        $email = $datos['email'] ?? '';
        $password = $datos['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Email y contraseña son requeridos']);
            exit();
        }

        // 1. Buscar al usuario
        $docRef = $db->collection('usuarios')->document($email);
        $snapshot = $docRef->snapshot();

        if (!$snapshot->exists()) {
            http_response_code(404); // Not Found
            echo json_encode(['error' => 'Usuario no encontrado']);
            exit();
        }

        // 2. Verificar la contraseña hasheada
        $usuario = $snapshot->data();
        
        if (password_verify($password, $usuario['password'])) {
            // ¡Éxito!
            http_response_code(200);
            echo json_encode([
                'mensaje' => 'Login exitoso',
                'email' => $usuario['email'],
                'rol' => $usuario['rol']
            ]);
        } else {
            // ¡Contraseña incorrecta!
            http_response_code(401); // Unauthorized
            echo json_encode(['error' => 'Contraseña incorrecta']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error en el servidor: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Solo se permite el método POST para /api/login']);
}
?>