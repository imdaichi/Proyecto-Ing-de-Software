<?php
// ============================================
// USUARIOS.PHP - Gestión de Usuarios
// ============================================

// 1. Verificar conexión (Seguridad)
if (!isset($db)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión interna (db no definida)']);
    exit;
}

// ---------------------------------------------------------
// MÉTODO GET: LISTAR TODOS LOS USUARIOS
// ---------------------------------------------------------
if ($metodo === 'GET') {
    try {
        $usersRef = $db->collection('usuarios');
        $snapshot = $usersRef->documents();
        
        $listaUsuarios = [];
        
        foreach ($snapshot as $userDoc) {
            if ($userDoc->exists()) {
                $data = $userDoc->data();
                
                if(isset($data['password'])) {
                    unset($data['password']); 
                }
                
                $data['id_db'] = $userDoc->id(); 
                
                $listaUsuarios[] = $data;
            }
        }

        http_response_code(200);
        echo json_encode($listaUsuarios);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener usuarios: ' . $e->getMessage()]);
    }
}

// ---------------------------------------------------------
// MÉTODO POST: (Reservado para crear usuarios en el futuro)
// ---------------------------------------------------------
// ---------------------------------------------------------
// MÉTODO POST: ACTUALIZAR USUARIO (Nombre y Rol)
// ---------------------------------------------------------
if ($metodo === 'POST') {
    $id_db = $datos['id_db'] ?? null;
    $nuevoNombre = $datos['nombre'] ?? null;
    $nuevoRol = $datos['rol'] ?? null;

    if (!$id_db) {
        http_response_code(400); echo json_encode(['error' => 'Falta ID de usuario']); exit;
    }

    try {
        $docRef = $db->collection('usuarios')->document($id_db);
        
        // Preparamos los datos a actualizar
        $updateData = [];
        if ($nuevoNombre !== null) $updateData['nombre'] = $nuevoNombre;
        // Aseguramos que el rol sea uno válido
        if ($nuevoRol && in_array(strtolower($nuevoRol), ['admin', 'vendedor'])) {
            $updateData['rol'] = strtolower($nuevoRol);
        }

        if (!empty($updateData)) {
            $docRef->set($updateData, ['merge' => true]); // Merge para no borrar otros campos
            http_response_code(200);
            echo json_encode(['mensaje' => 'Usuario actualizado correctamente']);
        } else {
            echo json_encode(['mensaje' => 'No hubo cambios válidos para guardar']);
        }
    } catch (Exception $e) {
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
// ---------------------------------------------------------
// MÉTODO DELETE: ELIMINAR USUARIO
// ---------------------------------------------------------
if ($metodo === 'DELETE') {
    // Obtenemos el ID de la URL (ej: /usuarios?id=XYZ)
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400); echo json_encode(['error' => 'Falta el ID']); exit;
    }

    try {
        $db->collection('usuarios')->document($id)->delete();
        http_response_code(200);
        echo json_encode(['mensaje' => 'Usuario eliminado correctamente']);
    } catch (Exception $e) {
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>