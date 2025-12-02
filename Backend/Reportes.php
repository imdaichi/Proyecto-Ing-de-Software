<?php
// Backend/Reportes.php
require_once __DIR__ . '/Config/db.php';

// Parche de compatibilidad
if (!isset($pdo) && isset($db)) { $pdo = $db; }

// Headers para asegurar que el navegador sepa que es UTF-8
header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo)) {
    http_response_code(500); echo json_encode(['error' => 'Error: No hay conexión a BD']); exit;
}

if ($metodo === 'GET') {
    $tipo = $_GET['tipo'] ?? 'normal';

    // ==========================================
    // A. MODO DASHBOARD (GRÁFICOS)
    // ==========================================
    if ($tipo === 'dashboard') {
        try {
            // 1. Inventario
            $sqlInv = "SELECT SUM(precio_venta * stock) as total FROM productos WHERE estado = 'activo'";
            $resInv = $pdo->query($sqlInv)->fetch(PDO::FETCH_ASSOC);
            $valorInventario = (int)($resInv['total'] ?? 0);

            // 2. Ventas
            $sqlVentas = "SELECT fecha, total, items FROM ventas";
            $todasVentas = $pdo->query($sqlVentas)->fetchAll(PDO::FETCH_ASSOC);

            $ventasPorMes = [];
            $conteoProductos = [];

            foreach ($todasVentas as $v) {
                // Agrupar por mes
                $mes = substr($v['fecha'], 0, 7); 
                if (!isset($ventasPorMes[$mes])) $ventasPorMes[$mes] = 0;
                $ventasPorMes[$mes] += (int)$v['total'];

                // Procesar Items
                $items = json_decode($v['items'], true);
                if (is_array($items)) {
                    foreach ($items as $item) {
                        $nombre = $item['titulo'] ?? $item['Titulo'] ?? 'Desconocido';
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

            // ENVÍO SEGURO CON FLAGS PARA EVITAR ERRORES DE TILDE
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

    // ==========================================
    // B. MODO REPORTE (TABLA DE VENTAS)
    // ==========================================
    $inicio = $_GET['inicio'] ?? null;
    $fin = $_GET['fin'] ?? null;

    if ($inicio && $fin) {
        try {
            // Consulta SQL
            $stmt = $pdo->prepare("SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC");
            $stmt->execute(["$inicio 00:00:00", "$fin 23:59:59"]);
            $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $final = [];
            $total = 0;

            foreach ($raw as $r) {
                // Intentar decodificar los items
                $itemsDecoded = json_decode($r['items'], true);
                
                // Si json_decode falla (devuelve null), ponemos un array vacío para no romper el JS
                $r['items'] = is_array($itemsDecoded) ? $itemsDecoded : []; 
                
                // Convertir ID a string para JS
                $r['id_venta'] = (string)$r['id']; 
                
                $total += (int)$r['total'];
                $final[] = $r;
            }

            // ENVÍO SEGURO: Si hay caracteres raros, los ignora en lugar de bloquear todo
            $jsonOutput = json_encode([
                'total_monto' => $total, 
                'cantidad_ventas' => count($final),
                'ventas' => $final
            ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

            if ($jsonOutput === false) {
                // Si aún así falla, enviamos error específico
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