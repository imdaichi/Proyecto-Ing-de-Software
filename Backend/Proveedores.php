<?php
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/CacheInvalidator.php';

if (!isset($pdo)) {
    http_response_code(500); 
    echo json_encode(['error' => 'Error de conexión a la base de datos']); 
    exit;
}


if ($metodo === 'GET') {
    try {
        // Intentar obtener del caché
        $proveedores = $cache->get('proveedores_list');
        
        if ($proveedores === null) {
            // No está en caché, consultar BD
            $stmt = $pdo->query("SELECT * FROM proveedores ORDER BY id DESC");
            $proveedores = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Guardar en caché (10 minutos)
            $cache->set('proveedores_list', $proveedores, 600);
        }
        
        echo json_encode($proveedores);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al leer: ' . $e->getMessage()]);
    }
}

if ($metodo === 'POST') {

    $id_prov = $datos['id_prov'] ?? null; 
    
    $nombre    = $datos['nombre'] ?? null;
    $contacto  = $datos['contacto'] ?? '';
    $telefono  = $datos['telefono'] ?? '';
    $email     = $datos['email'] ?? '';
    $categoria = $datos['categoria'] ?? 'General';

    if (!$nombre) {
        http_response_code(400); 
        echo json_encode(['error' => 'El nombre de la empresa es obligatorio']); 
        exit;
    }

    try {
        if ($id_prov) {
            $sql = "UPDATE proveedores SET nombre=?, contacto=?, telefono=?, email=?, categoria=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$nombre, $contacto, $telefono, $email, $categoria, $id_prov]);
            
            // Invalidar caché de proveedores
            $cacheInvalidator->invalidarProveedores();
            
            echo json_encode(['mensaje' => 'Proveedor actualizado correctamente']);
            
        } else {
            $sql = "INSERT INTO proveedores (nombre, contacto, telefono, email, categoria) VALUES (?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$nombre, $contacto, $telefono, $email, $categoria]);
            
            // Invalidar caché de proveedores
            $cacheInvalidator->invalidarProveedores();
            
            echo json_encode(['mensaje' => 'Proveedor creado exitosamente']);
        }

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al guardar: ' . $e->getMessage()]);
    }
}

if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400); 
        echo json_encode(['error' => 'Falta el ID del proveedor']); 
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM proveedores WHERE id = ?");
        $stmt->execute([$id]);
        
        // Invalidar caché de proveedores
        $cacheInvalidator->invalidarProveedores();
        
        echo json_encode(['mensaje' => 'Proveedor eliminado correctamente']);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al eliminar: ' . $e->getMessage()]);
    }
}
?>