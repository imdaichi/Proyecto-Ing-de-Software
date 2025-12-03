<?php
// Backend/Ventas.php
if (!isset($pdo)) exit;

if ($metodo === 'POST') {
    try {
        $pdo->beginTransaction();

        $total = $datos['total'];
        $items = $datos['items']; // Array
        $metodoPago = $datos['metodo_pago'] ?? 'efectivo';
        $emailUser = $datos['email_usuario'] ?? 'cajero';
        $descuento = $datos['descuento_aplicado'] ?? 0;

        // 1. Insertar Venta
        $stmt = $pdo->prepare("INSERT INTO ventas (total, metodo_pago, email_usuario, descuento_aplicado, items, fecha) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$total, $metodoPago, $emailUser, $descuento, json_encode($items)]);
        $idVenta = $pdo->lastInsertId();

        // 2. Convertir método de pago a texto legible
        $metodoPagoTexto = match($metodoPago) {
            'mercado_pago' => 'Mercado Pago',
            'debito' => 'Débito',
            'credito' => 'Crédito',
            'efectivo' => 'Efectivo',
            default => ucfirst($metodoPago)
        };

        // 3. Procesar Items (Descontar Stock y Bitácora)
        $stmtProd = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE sku = ?");
        $stmtMov = $pdo->prepare("INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, 'salida', ?, ?, NOW())");

        foreach ($items as $item) {
            $cant = $item['cantidad'];
            $sku = $item['sku'] ?? null; // Asegúrate de que el frontend mande SKU
            $titulo = $item['titulo'];

            // Descontar Stock (Solo si hay SKU)
            if ($sku) {
                $stmtProd->execute([$cant, $sku]);
                
                // Registrar movimiento con método de pago
                $detalle = "Venta #$idVenta (x$cant) - $metodoPagoTexto";
                $stmtMov->execute([$sku, $titulo, $detalle, $emailUser]);
            }
        }

        $pdo->commit();
        echo json_encode(['mensaje' => 'Venta registrada', 'id_venta' => $idVenta]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>