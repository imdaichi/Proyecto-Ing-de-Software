<?php
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/CacheInvalidator.php';

if (!isset($pdo)) exit;

if ($metodo === 'GET') {
    try {
        // Intentar obtener del caché
        $usuarios = $cache->get('usuarios_list');
        
        if ($usuarios === null) {
            // No está en caché, consultar BD
            $stmt = $pdo->query("SELECT * FROM usuarios");
            $usuarios = $stmt->fetchAll();
            
            $final = [];
            foreach($usuarios as $u){
                $u['id_db'] = $u['id'];
                $final[] = $u;
            }
            
            // Guardar en caché (10 minutos)
            $cache->set('usuarios_list', $final, 600);
            $usuarios = $final;
        }
        
        echo json_encode($usuarios);
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
            $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, rol=? WHERE id=?");
            $stmt->execute([$nombre, $rol, $id]);
        } else {
            if (!$email) { throw new Exception('Email obligatorio'); }
            if (!$contrasena) { throw new Exception('Contraseña obligatoria'); }
            $hash = password_hash($contrasena, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, rol, password) VALUES (?, ?, ?, ?)");
            $stmt->execute([$nombre, $email, $rol, $hash]);
        }
        
        // Invalidar caché de usuarios
        $cacheInvalidator->invalidarUsuarios();
        
        echo json_encode(['mensaje' => 'Guardado']);
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if($id) {
        $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
        
        // Invalidar caché de usuarios
        $cacheInvalidator->invalidarUsuarios();
        
        echo json_encode(['mensaje' => 'Eliminado']);
    }
}
?>