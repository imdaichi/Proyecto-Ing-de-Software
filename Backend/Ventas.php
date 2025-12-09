<?php

require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/CacheInvalidator.php';

if (!isset($pdo)) exit;

// Inicializar Firebase
$firebase = null;
$firestore = null;

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    
    try {
        $credentialsPath = __DIR__ . '/firebase-credentials.json';
        if (file_exists($credentialsPath)) {
            $firebase = (new \Kreait\Firebase\Factory)->withServiceAccount($credentialsPath);
            $firestore = $firebase->createFirestore()->database();
        }
    } catch (Exception $e) {
        error_log("Firebase init error: " . $e->getMessage());
        $firestore = null;
    }
}

if ($metodo === 'POST') {
    try {
        // Verificar si ya se hizo el cierre de caja del día
        $fechaHoy = date('Y-m-d');
        $stmt = $pdo->prepare("
            SELECT id FROM cierres_caja 
            WHERE DATE(fecha_cierre) = ?
            LIMIT 1
        ");
        $stmt->execute([$fechaHoy]);
        $cierreExistente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($cierreExistente) {
            http_response_code(403);
            echo json_encode([
                'error' => 'No se pueden realizar ventas. El cierre de caja del día ya fue realizado.'
            ]);
            exit;
        }
        
        $pdo->beginTransaction();

        $total = $datos['total'];
        $items = $datos['items']; 
        $metodoPago = $datos['metodo_pago'] ?? 'efectivo';
        $emailUser = $datos['email_usuario'] ?? 'cajero';
        $descuento = $datos['descuento_aplicado'] ?? 0;
        // Usar date() que respeta date_default_timezone_set(), no microtime() que es UTC siempre
        $ahora = microtime(true);
        $microsegundos = sprintf("%06d", ($ahora - floor($ahora)) * 1000000);
        $fechaActual = date('Y-m-d H:i:s') . '.' . $microsegundos;

        $stmt = $pdo->prepare("INSERT INTO ventas (total, metodo_pago, email_usuario, descuento_aplicado, items, fecha) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$total, $metodoPago, $emailUser, $descuento, json_encode($items), $fechaActual]);
        $idVenta = $pdo->lastInsertId();

        $metodoPagoTexto = match($metodoPago) {
            'mercado_pago' => 'Mercado Pago',
            'debito' => 'Débito',
            'credito' => 'Crédito',
            'efectivo' => 'Efectivo',
            default => ucfirst($metodoPago)
        };

        $stmtProd = $pdo->prepare("UPDATE productos SET stock = stock - ? WHERE sku = ?");
        $stmtMov  = $pdo->prepare("INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, ?, ?, ?, ?)");
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


            $detalle = "Venta #$idVenta (x$cant) - $metodoPagoTexto | Stock: $stockAntes &rarr; $stockDespues";
            $stmtMov->execute([$sku, $tituloFinal, 'venta', $detalle, $emailUser, $fechaActual]);

            // Actualizar stock en Firebase
            if ($firestore) {
                try {
                    $docRef = $firestore->collection('productos')->document($sku);
                    $snapshot = $docRef->snapshot();
                    if ($snapshot->exists()) {
                        $currentStock = (int)($snapshot->data()['Stock'] ?? 0);
                        $newStock = max(0, $currentStock - $cant);
                        $docRef->update([
                            ['path' => 'Stock', 'value' => $newStock]
                        ]);
                    }
                } catch (Exception $fbError) {
                    error_log("Firebase update error for SKU $sku: " . $fbError->getMessage());
                }
            }
        }

        $pdo->commit();
        
        // Invalidar cachés relacionados con ventas
        $cacheInvalidator->invalidarVenta();

        // Archivado automático cada 30 días desde la primera venta
        try {
            require_once __DIR__ . '/ArchivarMovimientosService.php';

            // Leer última fecha de archivado (o primera venta)
            $stmtCfg = $pdo->prepare("SELECT valor FROM config WHERE clave = 'ultima_archiva_movimientos'");
            $stmtCfg->execute();
            $rowCfg = $stmtCfg->fetch(PDO::FETCH_ASSOC);

            $ahora = (new DateTime())->format('Y-m-d H:i:s');

            if (!$rowCfg) {
                // Primera venta: registrar fecha base, no archivar aún
                $pdo->prepare("INSERT INTO config (clave, valor) VALUES ('ultima_archiva_movimientos', ?)")
                    ->execute([$ahora]);
            } else {
                $ultima = $rowCfg['valor'];
                $diff = (new DateTime($ultima))->diff(new DateTime($ahora))->days;
                if ($diff >= 30) {
                    $resArch = archivarMovimientosService($pdo, 30);
                    // Actualizar timestamp de última ejecución solo si no falló
                    $pdo->prepare("UPDATE config SET valor=? WHERE clave='ultima_archiva_movimientos'")
                        ->execute([$ahora]);
                    if (isset($resArch['eliminados'])) {
                        error_log("Archivado auto: " . $resArch['eliminados'] . " registros, archivo: " . ($resArch['archivo'] ?? 'n/a'));
                    }
                }
            }
        } catch (Exception $archErr) {
            error_log('Error archivado auto: ' . $archErr->getMessage());
        }
        
        echo json_encode(['mensaje' => 'Venta registrada', 'id_venta' => $idVenta]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>