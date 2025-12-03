<?php
// Backend/Usuarios.php
if (!isset($pdo)) exit;

if ($metodo === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM usuarios");
        $usuarios = $stmt->fetchAll();
        
        // Adaptar ID para el Frontend
        $final = [];
        foreach($usuarios as $u){
            $u['id_db'] = $u['id'];
            $final[] = $u;
        }
        echo json_encode($final);
    } catch (Exception $e) {
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}

if ($metodo === 'POST') {
    $id = $datos['id_db'] ?? null;
    $nombre = $datos['nombre'] ?? '';
    $rol = $datos['rol'] ?? 'vendedor';
    $email = $datos['email'] ?? null;
    $contrasena = $datos['contrasena'] ?? null;

    try {
        if ($id) {
            // Actualizar existente
            $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, rol=? WHERE id=?");
            $stmt->execute([$nombre, $rol, $id]);
        } else {
            // Crear nuevo
            if (!$email) { throw new Exception('Email obligatorio'); }
            if (!$contrasena) { throw new Exception('Contraseña obligatoria'); }
            // Si viene contraseña, hash, de lo contrario null
            $hash = password_hash($contrasena, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, rol, password) VALUES (?, ?, ?, ?)");
            $stmt->execute([$nombre, $email, $rol, $hash]);
        }
        echo json_encode(['mensaje' => 'Guardado']);
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if($id) {
        $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
        echo json_encode(['mensaje' => 'Eliminado']);
    }
}
?>