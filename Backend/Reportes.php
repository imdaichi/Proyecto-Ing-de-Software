<?php
require_once __DIR__ . '/Config/db.php';

if (!isset($pdo) && isset($db)) { $pdo = $db; }

header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo)) {
    http_response_code(500); echo json_encode(['error' => 'Error: No hay conexión a BD']); exit;
}

if ($metodo === 'GET') {
    $tipo = $_GET['tipo'] ?? 'normal';

    if ($tipo === 'dashboard') {
        try {
            $sqlInv = "SELECT SUM(precio_venta * stock) as total FROM productos WHERE estado = 'activo' AND stock > 0";
            $resInv = $pdo->query($sqlInv)->fetch(PDO::FETCH_ASSOC);
            $valorInventario = (int)($resInv['total'] ?? 0);
            $sqlVentas = "SELECT fecha, total, items FROM ventas";
            $todasVentas = $pdo->query($sqlVentas)->fetchAll(PDO::FETCH_ASSOC);
            $ventasPorMes = [];
            $conteoProductos = [];
            foreach ($todasVentas as $v) {
                $mes = substr($v['fecha'], 0, 7); 
                if (!isset($ventasPorMes[$mes])) $ventasPorMes[$mes] = 0;
                $ventasPorMes[$mes] += (int)$v['total'];
                $items = json_decode($v['items'], true);
                if (is_array($items)) {
                    foreach ($items as $item) {
                        $nombre = $item['titulo']
                            ?? $item['Titulo']
                            ?? ($item['producto']['Titulo'] ?? $item['producto']['titulo'] ?? null)
                            ?? 'Desconocido';
                        $cant = (int)($item['cantidad'] ?? 1);
                        if (!isset($conteoProductos[$nombre])) $conteoProductos[$nombre] = 0;
                        $conteoProductos[$nombre] += $cant;
                    }
                }
            }

            $topProducto = 'Sin datos'; $maxVentas = 0;
            foreach ($conteoProductos as $prod => $cantidad) {
                if ($cantidad > $maxVentas) { $maxVentas = $cantidad; $topProducto = $prod; }
            }
            ksort($ventasPorMes);

            echo json_encode([
                'valor_inventario' => $valorInventario,
                'top_producto' => $topProducto . " ($maxVentas)",
                'ventas_mes' => $ventasPorMes
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_IGNORE);

        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['error' => 'Error Dashboard: ' . $e->getMessage()]);
        }
        exit;
    }

    $inicio = $_GET['inicio'] ?? null;
    $fin = $_GET['fin'] ?? null;

    if ($inicio && $fin) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC");
            $stmt->execute(["$inicio 00:00:00", "$fin 23:59:59"]);
            $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $final = [];
            $total = 0;

            foreach ($raw as $r) {
                $itemsDecoded = json_decode($r['items'], true);
                $r['items'] = is_array($itemsDecoded) ? $itemsDecoded : []; 
                
                $r['id_venta'] = (string)$r['id']; 
                
                $total += (int)$r['total'];
                $final[] = $r;
            }

            $jsonOutput = json_encode([
                'total_monto' => $total, 
                'cantidad_ventas' => count($final),
                'ventas' => $final
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

            if ($jsonOutput === false) {
                throw new Exception("Error codificando JSON: " . json_last_error_msg());
            }

            echo $jsonOutput;

        } catch (Exception $e) {
            http_response_code(500); 
            echo json_encode(['error' => 'Error Reporte: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400); 
        echo json_encode(['error' => 'Faltan fechas inicio/fin']);
    }
}
?>