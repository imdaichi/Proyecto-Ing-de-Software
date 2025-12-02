<?php
// Backend/Login.php
if (!isset($pdo)) exit;

if ($metodo === 'POST') {
    $email = $datos['email'] ?? '';
    $pass  = $datos['password'] ?? '';

    try {
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Comparación simple (Para producción usa password_verify)
        if ($user && $user['password'] === $pass) {
            unset($user['password']); // No enviar pass al frontend
            
            // Adaptar ID para compatibilidad con JS
            $user['id_db'] = $user['id']; 
            
            echo json_encode(['mensaje' => 'Login OK', 'usuario' => $user]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Credenciales incorrectas']);
        }
    } catch (Exception $e) {
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>