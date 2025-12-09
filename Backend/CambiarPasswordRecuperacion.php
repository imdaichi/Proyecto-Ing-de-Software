<?php

if (!isset($pdo)) exit;

if ($metodo === 'POST') {
    try {
        $token = $datos['token'] ?? null;
        $password = $datos['password'] ?? null;
        $password_confirm = $datos['password_confirm'] ?? null;
        
        if (!$token || !$password || !$password_confirm) {
            http_response_code(400);
            echo json_encode(['error' => 'Todos los campos son requeridos']);
            exit;
        }
        
        if ($password !== $password_confirm) {
            http_response_code(400);
            echo json_encode(['error' => 'Las contraseñas no coinciden']);
            exit;
        }
        
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
            exit;
        }
        
        // Validar token
        $stmt = $pdo->prepare("
            SELECT email, fecha_expiracion, usado 
            FROM password_reset_tokens 
            WHERE token = ?
            LIMIT 1
        ");
        $stmt->execute([$token]);
        $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tokenData) {
            http_response_code(404);
            echo json_encode(['error' => 'Token inválido']);
            exit;
        }
        
        if ($tokenData['usado']) {
            http_response_code(403);
            echo json_encode(['error' => 'Este link ya fue utilizado']);
            exit;
        }
        
        $ahora = new DateTime();
        $expiracion = new DateTime($tokenData['fecha_expiracion']);
        
        if ($ahora > $expiracion) {
            http_response_code(403);
            echo json_encode(['error' => 'El link ha expirado']);
            exit;
        }
        
        // Hashear nueva contraseña
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        
        // Actualizar contraseña del usuario
        $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE email = ?");
        $stmt->execute([$password_hash, $tokenData['email']]);
        
        // Marcar token como usado
        $stmt = $pdo->prepare("UPDATE password_reset_tokens SET usado = TRUE WHERE token = ?");
        $stmt->execute([$token]);
        
        echo json_encode([
            'exito' => true,
            'mensaje' => 'Contraseña actualizada correctamente'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
