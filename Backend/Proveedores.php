<?php
// ==========================================================
// BACKEND/PROVEEDORES.PHP (VERSIÓN MYSQL PDO)
// ==========================================================

// 1. VERIFICAR CONEXIÓN
// Este archivo se carga desde index.php, así que ya debe existir $pdo
if (!isset($pdo)) {
    http_response_code(500); 
    echo json_encode(['error' => 'Error de conexión a la base de datos']); 
    exit;
}

// ---------------------------------------------------------
// MÉTODO GET: LISTAR TODOS LOS PROVEEDORES
// ---------------------------------------------------------
if ($metodo === 'GET') {
    try {
        // Consultamos la tabla 'proveedores'
        $stmt = $pdo->query("SELECT * FROM proveedores ORDER BY id DESC");
        $proveedores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Enviamos la lista al frontend
        echo json_encode($proveedores);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al leer: ' . $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// MÉTODO POST: CREAR O ACTUALIZAR
// ---------------------------------------------------------
if ($metodo === 'POST') {
    // Recibimos los datos del JSON
    $id_prov = $datos['id_prov'] ?? null; // Si viene ID, es una EDICIÓN
    
    $nombre    = $datos['nombre'] ?? null;
    $contacto  = $datos['contacto'] ?? '';
    $telefono  = $datos['telefono'] ?? '';
    $email     = $datos['email'] ?? '';
    $categoria = $datos['categoria'] ?? 'General';

    // Validación básica
    if (!$nombre) {
        http_response_code(400); 
        echo json_encode(['error' => 'El nombre de la empresa es obligatorio']); 
        exit;
    }

    try {
        if ($id_prov) {
            // --- ACTUALIZAR (UPDATE) ---
            $sql = "UPDATE proveedores SET nombre=?, contacto=?, telefono=?, email=?, categoria=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$nombre, $contacto, $telefono, $email, $categoria, $id_prov]);
            
            echo json_encode(['mensaje' => 'Proveedor actualizado correctamente']);
            
        } else {
            // --- CREAR (INSERT) ---
            $sql = "INSERT INTO proveedores (nombre, contacto, telefono, email, categoria) VALUES (?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$nombre, $contacto, $telefono, $email, $categoria]);
            
            echo json_encode(['mensaje' => 'Proveedor creado exitosamente']);
        }

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al guardar: ' . $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// MÉTODO DELETE: ELIMINAR PROVEEDOR
// ---------------------------------------------------------
if ($metodo === 'DELETE') {
    // El ID viene por URL (ej: /proveedores?id=5)
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400); 
        echo json_encode(['error' => 'Falta el ID del proveedor']); 
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM proveedores WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['mensaje' => 'Proveedor eliminado correctamente']);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error al eliminar: ' . $e->getMessage()]);
    }
}
?>