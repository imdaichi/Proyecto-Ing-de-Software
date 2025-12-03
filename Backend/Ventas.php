<?php

if (!isset($pdo)) exit;

if ($metodo === 'POST') {
    try {
        $pdo->beginTransaction();

        $total = $datos['total'];
        $items = $datos['items']; 
        $metodoPago = $datos['metodo_pago'] ?? 'efectivo';
        $emailUser = $datos['email_usuario'] ?? 'cajero';
        $descuento = $datos['descuento_aplicado'] ?? 0;

        $stmt = $pdo->prepare("INSERT INTO ventas (total, metodo_pago, email_usuario, descuento_aplicado, items, fecha) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$total, $metodoPago, $emailUser, $descuento, json_encode($items)]);
        $idVenta = $pdo->lastInsertId();

        $metodoPagoTexto = match($metodoPago) {
            'mercado_pago' => 'Mercado Pago',
            'debito' => 'Débito',
            'credito' => 'Crédito',
            'efectivo' => 'Efectivo',
            default => ucfirst($metodoPago)
        };

        $stmtProd = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE sku = ?");
        $stmtMov  = $pdo->prepare("INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, 'venta', ?, ?, NOW())");
        $stmtGet  = $pdo->prepare("SELECT stock, titulo, estado FROM productos WHERE sku = ? FOR UPDATE");

        foreach ($items as $item) {
            $cant   = (int)($item['cantidad'] ?? 0);
            $sku    = $item['sku'] ?? null;
            $titulo = $item['titulo'] ?? null; 

            if (!$sku || $cant <= 0) { continue; }


            $stmtGet->execute([$sku]);
            $row = $stmtGet->fetch(PDO::FETCH_ASSOC);
            if (!$row) { throw new Exception("SKU no existe: $sku"); }
            $stockAntes = (int)$row['stock'];
            $estadoProd = strtolower($row['estado'] ?? '');
            if ($estadoProd !== 'activo') { throw new Exception("Producto inactivo: $sku"); }
            if ($stockAntes <= 0) { throw new Exception("Sin stock disponible para $sku"); }
            if ($stockAntes < $cant) { throw new Exception("Stock insuficiente para $sku"); }


            $stmtProd->execute([$cant, $sku]);
            $stockDespues = $stockAntes - $cant;


            $tituloFinal = $titulo ?? ($row['titulo'] ?? $sku);


            $detalle = "Venta #$idVenta (x$cant) - $metodoPagoTexto | Stock: $stockAntes → $stockDespues";
            $stmtMov->execute([$sku, $tituloFinal, $detalle, $emailUser]);
        }

        $pdo->commit();
        echo json_encode(['mensaje' => 'Venta registrada', 'id_venta' => $idVenta]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>