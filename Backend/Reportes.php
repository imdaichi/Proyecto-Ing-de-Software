<?php
// Backend/Reportes.php
require_once __DIR__ . '/Config/db.php';

// Parche compatibilidad
if (!isset($pdo) && isset($db)) { $pdo = $db; }
if (!isset($pdo)) { http_response_code(500); echo json_encode(['error' => 'Error BD']); exit; }

if ($metodo === 'GET') {
    $tipo = $_GET['tipo'] ?? 'normal';

    // A. DASHBOARD
    if ($tipo === 'dashboard') {
        try {
            // 1. Valor Inventario (Usando precio_venta)
            $sqlInv = "SELECT SUM(precio_venta * stock) as total FROM productos WHERE estado = 'activo'";
            $resInv = $pdo->query($sqlInv)->fetch(PDO::FETCH_ASSOC);
            $valorInventario = (int)($resInv['total'] ?? 0);

            // 2. Ventas y Top Producto
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
                        $nombre = $item['titulo'] ?? $item['Titulo'] ?? ($item['producto']['Titulo'] ?? 'Desconocido');
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
            ]);

        } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
        exit;
    }

    // B. REPORTE NORMAL
    $inicio = $_GET['inicio'] ?? null;
    $fin = $_GET['fin'] ?? null;

    if ($inicio && $fin) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC");
            $stmt->execute(["$inicio 00:00:00", "$fin 23:59:59"]);
            $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $final = []; $total = 0;
            foreach ($raw as $r) {
                $r['items'] = json_decode($r['items'], true);
                $r['id_venta'] = (string)$r['id']; 
                $total += (int)$r['total'];
                $final[] = $r;
            }
            echo json_encode(['total_monto' => $total, 'ventas' => $final]);
        } catch (Exception $e) { http_response_code(500); echo json_encode(['error' => $e->getMessage()]); }
    } else {
        http_response_code(400); echo json_encode(['error' => 'Faltan fechas']);
    }
}
?>