<?php

if (!isset($pdo)) exit;

if ($metodo === 'POST') {
    try {
        $email = $datos['email'] ?? null;
        
        if (!$email) {
            http_response_code(400);
            echo json_encode(['error' => 'Email es requerido']);
            exit;
        }
        
        // Verificar que el email existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$usuario) {
            http_response_code(404);
            echo json_encode(['error' => 'Email no encontrado']);
            exit;
        }
        
        // Generar token aleatorio de 32 caracteres
        $token = bin2hex(random_bytes(16));
        $token_hash = password_hash($token, PASSWORD_BCRYPT);
        $fecha_expiracion = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        // Eliminar tokens anteriores no usados del mismo email
        $pdo->prepare("DELETE FROM password_reset_tokens WHERE email = ? AND usado = FALSE")->execute([$email]);
        
        // Guardar nuevo token
        $stmt = $pdo->prepare("
            INSERT INTO password_reset_tokens (email, token, token_hash, fecha_expiracion)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$email, $token, $token_hash, $fecha_expiracion]);
        
        // Construir URL del reset (apunta al archivo HTML en Frontend)
        $resetUrl = "http://localhost:8000/frontend/reset-password.html?token=" . $token;
        
        echo json_encode([
            'exito' => true,
            'mensaje' => 'Link de recuperación generado',
            'link' => $resetUrl,
            'email' => $email
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
