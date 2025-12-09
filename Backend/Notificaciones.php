<?php
require_once __DIR__ . '/Cache.php';

if (!isset($pdo)) exit;

// Inicializar el sistema de caché
$cache = new Cache();

if ($metodo === 'GET') {
    try {
        // Obtener configuración de notificaciones
        $stmtConfig = $pdo->query("SELECT dias_stock_bajo, dias_sin_ventas, dias_periodo_gracia FROM config_notificaciones WHERE id = 1");
        $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);
        
        if (!$config) {
            $config = [
                'dias_stock_bajo' => 3,
                'dias_sin_ventas' => 80,
                'dias_periodo_gracia' => 21
            ];
        }
        
        $diasStockBajo = (int)$config['dias_stock_bajo'];
        $diasSinVentas = (int)$config['dias_sin_ventas'];
        $diasPeriodoGracia = (int)$config['dias_periodo_gracia'];
        
        // Intentar obtener del caché (5 minutos)
        $alertas = $cache->get('notificaciones_productos');
        
        if ($alertas === null) {
            // No está en caché, calcular
            // Obtener productos activos con stock
            $sqlProductos = "SELECT sku, titulo, stock, categoria FROM productos WHERE estado = 'activo' AND stock > 0";
            $stmtProductos = $pdo->query($sqlProductos);
            $productos = $stmtProductos->fetchAll(PDO::FETCH_ASSOC);
            
            $alertas = [];
            
            foreach ($productos as $prod) {
                $sku = $prod['sku'];
                
                // ALERTA 1: STOCK BAJO (menos de X unidades, según configuración) - PRIORIDAD ALTA
                if ($prod['stock'] < $diasStockBajo) {
                    $alertas[] = [
                        'sku' => $prod['sku'],
                        'titulo' => $prod['titulo'],
                        'stock' => $prod['stock'],
                        'categoria' => $prod['categoria'],
                        'motivo' => 'Stock bajo',
                        'detalle' => $prod['stock'] . ' unidad' . ($prod['stock'] == 1 ? '' : 'es'),
                        'prioridad' => 'alta',
                        'tipo' => 'stock_bajo'
                    ];
                    continue; // No evaluar otras alertas para este producto
                }
                
                // ALERTA 2: SIN VENTAS POR MUCHO TIEMPO - PRIORIDAD MEDIA
                // Buscar última venta
                $sqlVenta = "SELECT fecha FROM movimientos WHERE sku = ? AND tipo = 'venta' ORDER BY fecha DESC LIMIT 1";
                $stmtVenta = $pdo->prepare($sqlVenta);
                $stmtVenta->execute([$sku]);
                $ultimaVenta = $stmtVenta->fetch(PDO::FETCH_ASSOC);
                
                // Buscar último cambio de precio
                $sqlPrecio = "SELECT fecha FROM movimientos WHERE sku = ? AND tipo = 'precio' ORDER BY fecha DESC LIMIT 1";
                $stmtPrecio = $pdo->prepare($sqlPrecio);
                $stmtPrecio->execute([$sku]);
                $ultimoPrecio = $stmtPrecio->fetch(PDO::FETCH_ASSOC);
                
                // Buscar último cambio de stock (entrada o salida)
                $sqlCambioStock = "SELECT fecha FROM movimientos WHERE sku = ? AND (tipo LIKE '%entrada%' OR tipo LIKE '%salida%') ORDER BY fecha DESC LIMIT 1";
                $stmtCambioStock = $pdo->prepare($sqlCambioStock);
            $stmtCambioStock->execute([$sku]);
            $ultimoCambioStock = $stmtCambioStock->fetch(PDO::FETCH_ASSOC);
            
            // Determinar fecha de referencia para contar días sin venta
            $fechaReferencia = null;
            
            if ($ultimaVenta) {
                $fechaReferencia = $ultimaVenta['fecha'];
            } else {
                // Si nunca se ha vendido, buscar última entrada
                $sqlEntrada = "SELECT fecha FROM movimientos WHERE sku = ? AND tipo LIKE '%entrada%' ORDER BY fecha DESC LIMIT 1";
                $stmtEntrada = $pdo->prepare($sqlEntrada);
                $stmtEntrada->execute([$sku]);
                $ultimaEntrada = $stmtEntrada->fetch(PDO::FETCH_ASSOC);
                
                if ($ultimaEntrada) {
                    $fechaReferencia = $ultimaEntrada['fecha'];
                }
            }
            
            if (!$fechaReferencia) continue; // Si no hay movimientos, no alertar
            
            // Calcular días desde la fecha de referencia (última venta o entrada)
            $sqlDias = "SELECT DATEDIFF(NOW(), ?) as dias";
            $stmtDias = $pdo->prepare($sqlDias);
            $stmtDias->execute([$fechaReferencia]);
            $diasSinVenta = (int)$stmtDias->fetch(PDO::FETCH_ASSOC)['dias'];
            
            // Verificar si hay cambio de precio reciente
            $enPeriodoGracia = false;
            if ($ultimoPrecio) {
                $sqlDiasPrecio = "SELECT DATEDIFF(NOW(), ?) as dias";
                $stmtDiasPrecio = $pdo->prepare($sqlDiasPrecio);
                $stmtDiasPrecio->execute([$ultimoPrecio['fecha']]);
                $diasDesdePrecio = (int)$stmtDiasPrecio->fetch(PDO::FETCH_ASSOC)['dias'];
                
                // Si el cambio de precio es más reciente que la última venta
                if ($ultimaVenta && strtotime($ultimoPrecio['fecha']) > strtotime($ultimaVenta['fecha'])) {
                    // Dar período de gracia según configuración
                    if ($diasDesdePrecio < $diasPeriodoGracia) {
                        $enPeriodoGracia = true;
                    } else {
                        // Ya pasó el período de gracia desde el cambio de precio, contar desde ahí
                        $diasSinVenta = $diasDesdePrecio;
                    }
                } elseif (!$ultimaVenta) {
                    // Si nunca se ha vendido pero cambió el precio recientemente
                    if ($diasDesdePrecio < $diasPeriodoGracia) {
                        $enPeriodoGracia = true;
                    } else {
                        // Usar el mayor entre días desde precio y días sin venta
                        $diasSinVenta = max($diasSinVenta, $diasDesdePrecio);
                    }
                }
            }
            
            // No alertar si está en período de gracia
            if ($enPeriodoGracia) continue;
            
            // Mostrar alerta si:
            // 1. Lleva más de X días sin venta (según configuración), O
            // 2. Cambió el precio hace más de X días y no ha vendido desde entonces
            $alertarPorCambioPrecio = false;
            if ($ultimoPrecio && strtotime($ultimoPrecio['fecha']) > strtotime($ultimaVenta['fecha'] ?? '1970-01-01')) {
                $sqlDiasPrecio2 = "SELECT DATEDIFF(NOW(), ?) as dias";
                $stmtDiasPrecio2 = $pdo->prepare($sqlDiasPrecio2);
                $stmtDiasPrecio2->execute([$ultimoPrecio['fecha']]);
                $diasDesdeCambioPrecio = (int)$stmtDiasPrecio2->fetch(PDO::FETCH_ASSOC)['dias'];
                if ($diasDesdeCambioPrecio > $diasPeriodoGracia) {
                    $alertarPorCambioPrecio = true;
                }
            }
            
            if ($diasSinVenta > $diasSinVentas || $alertarPorCambioPrecio) {
                $alertas[] = [
                    'sku' => $prod['sku'],
                    'titulo' => $prod['titulo'],
                    'stock' => $prod['stock'],
                    'categoria' => $prod['categoria'],
                    'motivo' => 'Sin ventas',
                    'detalle' => $diasSinVenta . ' día' . ($diasSinVenta == 1 ? '' : 's') . ' sin venta',
                    'prioridad' => 'media',
                    'tipo' => 'sin_ventas',
                    'ultima_entrada' => $fechaReferencia,
                    'ultimo_cambio_stock' => $ultimoCambioStock ? $ultimoCambioStock['fecha'] : null,
                    'dias_bodega' => $diasSinVenta
                ];
            }
        }
        
        // Ordenar por prioridad (alta primero) y luego por días sin venta
        usort($alertas, function($a, $b) {
            $prioridadOrden = ['alta' => 1, 'media' => 2, 'baja' => 3];
            $prioA = $prioridadOrden[$a['prioridad']] ?? 99;
            $prioB = $prioridadOrden[$b['prioridad']] ?? 99;
            
            if ($prioA != $prioB) {
                return $prioA - $prioB;
            }
            
            // Si misma prioridad, ordenar por días sin venta (descendente)
            $diasA = $a['dias_bodega'] ?? 0;
            $diasB = $b['dias_bodega'] ?? 0;
            return $diasB - $diasA;
        });
        
        // Guardar en caché (5 minutos)
        $cache->set('notificaciones_productos', $alertas, 300);
        }
        
        echo json_encode([
            'total' => count($alertas),
            'alertas' => $alertas
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
