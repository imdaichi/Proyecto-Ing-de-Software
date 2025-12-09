<?php

if (!isset($pdo)) exit;

if ($metodo === 'GET') {
    try {
        $token = $_GET['token'] ?? null;
        
        if (!$token) {
            http_response_code(400);
            echo json_encode(['error' => 'Token no proporcionado']);
            exit;
        }
        
        // Buscar el token
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
            echo json_encode(['error' => 'El link ha expirado (válido por 1 hora)']);
            exit;
        }
        
        echo json_encode([
            'exito' => true,
            'email' => $tokenData['email'],
            'mensaje' => 'Token válido'
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
