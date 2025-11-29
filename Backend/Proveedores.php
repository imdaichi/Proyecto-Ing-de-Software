<?php
// ============================================
// PROVEEDORES.PHP - Gestión Completa (CRUD)
// ============================================

if (!isset($db)) {
    http_response_code(500); echo json_encode(['error' => 'Error de conexión']); exit;
}

// 1. GET: Listar
if ($metodo === 'GET') {
    try {
        $docs = $db->collection('proveedores')->documents();
        $lista = [];
        foreach ($docs as $doc) {
            if ($doc->exists()) {
                $d = $doc->data(); $d['id'] = $doc->id(); $lista[] = $d;
            }
        }
        echo json_encode($lista);
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
}

// 2. POST: Crear o Actualizar
if ($metodo === 'POST') {
    $id_prov = $datos['id_prov'] ?? null;
    $dataGuardar = [
        'nombre' => $datos['nombre'] ?? 'Sin Nombre',
        'contacto' => $datos['contacto'] ?? '',
        'telefono' => $datos['telefono'] ?? '',
        'email' => $datos['email'] ?? '',
        'categoria' => $datos['categoria'] ?? 'General'
    ];

    try {
        if ($id_prov) {
            $db->collection('proveedores')->document($id_prov)->set($dataGuardar, ['merge' => true]);
            echo json_encode(['mensaje' => 'Proveedor actualizado']);
        } else {
            $db->collection('proveedores')->add($dataGuardar);
            echo json_encode(['mensaje' => 'Proveedor creado']);
        }
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
}

// 3. DELETE: Eliminar (NUEVO)
if ($metodo === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400); echo json_encode(['error' => 'Falta el ID']); exit;
    }

    try {
        $db->collection('proveedores')->document($id)->delete();
        echo json_encode(['mensaje' => 'Proveedor eliminado']);
    } catch (Exception $e) {
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>