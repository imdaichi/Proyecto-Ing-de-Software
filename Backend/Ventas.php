<?php
// ============================================
// VENTAS.PHP - Gestión de Ventas
// ============================================
// POST: Registrar una venta

if (!isset($db)) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexión con Firebase no disponible']);
    exit;
}

if ($metodo === 'POST') {
    try {
        // Obtener datos de la venta
        $email_usuario = $datos['email_usuario'] ?? null;
        $fecha = $datos['fecha'] ?? date('c');
        $timestamp = $datos['timestamp'] ?? time();
        $items = $datos['items'] ?? [];
        $total = $datos['total'] ?? 0;
        $metodo_pago = $datos['metodo_pago'] ?? 'efectivo';
        $estado = $datos['estado'] ?? 'completada';
        
        if (!$email_usuario || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Datos incompletos para la venta']);
            exit;
        }
        
        // Generar ID único para la venta
        $idVenta = 'VENTA-' . date('YmdHis') . '-' . rand(10000, 99999);
        
        // Guardar venta en Firebase
        $db->collection('ventas')->document($idVenta)->set([
            'email_usuario' => $email_usuario,
            'fecha' => $fecha,
            'timestamp' => intval($timestamp),
            'items' => $items,
            'total' => floatval($total),
            'metodo_pago' => $metodo_pago,
            'estado' => $estado,
            'fecha_legible' => date('Y-m-d H:i:s', intval($timestamp))
        ]);
        
        http_response_code(200);
        echo json_encode([
            'mensaje' => 'Venta registrada correctamente',
            'id_venta' => $idVenta
        ]);
        exit;
        
    } catch (Exception $e) {
        error_log('Ventas.php POST error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Error al registrar venta: ' . $e->getMessage()]);
        exit;
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Solo se permite el método POST para /api/ventas']);
    exit;
}

if ($metodo === 'GET') {
    // Si viene un ID en la URL, buscamos esa venta específica
    if ($id_url) {
        $doc = $db->collection('ventas')->document($id_url)->snapshot();
        if ($doc->exists()) {
             echo json_encode($doc->data());
        } else {
             http_response_code(404);
             echo json_encode(['error' => 'Venta no encontrada']);
        }
        exit;
    }
    // Si no hay ID, listamos todas (tu lógica actual)
}
?>
