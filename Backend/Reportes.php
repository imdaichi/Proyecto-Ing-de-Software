<?php
// ============================================
// REPORTES.PHP - Sistema de Reportes
// ============================================
// GET /reportes/movimientos - Obtener movimientos por rango de fechas
// GET /reportes/ventas - Obtener ventas por rango de fechas
// POST /reportes/movimientos - Crear movimiento manual

if (!isset($db)) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexión con Firebase no disponible']);
    exit;
}

// Obtener subruta de reportes
$subruta = str_replace('/reportes', '', $ruta);
$subruta = preg_replace('#/$#', '', $subruta); // Remover / del final si existe

// ============================================
// RUTA: /api/reportes/movimientos
// ============================================

if (strpos($subruta, '/movimientos') === 0) {
    
    // GET: Obtener movimientos con filtro de fechas
    if ($metodo === 'GET') {
        $fechaInicio = $_GET['inicio'] ?? '';
        $fechaFin = $_GET['fin'] ?? '';
        
        if (empty($fechaInicio) || empty($fechaFin)) {
            http_response_code(400);
            echo json_encode(['error' => 'Fechas de inicio y fin requeridas']);
            exit;
        }
        
        try {
            // Convertir fechas a timestamp
            $inicioTimestamp = strtotime($fechaInicio . ' 00:00:00');
            $finTimestamp = strtotime($fechaFin . ' 23:59:59');
            
            if ($inicioTimestamp === false || $finTimestamp === false) {
                http_response_code(400);
                echo json_encode(['error' => 'Formato de fecha inválido (usa YYYY-MM-DD)']);
                exit;
            }
            
            // Consultar Firebase
            $documentos = $db->collection('movimientos')
                ->orderBy('timestamp', 'DESC')
                ->documents();
            
            $movimientos = [];
            
            foreach ($documentos as $doc) {
                if (!$doc->exists()) continue;
                
                $datos = $doc->data();
                $movTimestamp = $datos['timestamp'] ?? 0;
                
                // Filtrar por rango de fechas
                if ($movTimestamp >= $inicioTimestamp && $movTimestamp <= $finTimestamp) {
                    $movimientos[] = [
                        'id' => $doc->id(),
                        'fecha' => date('Y-m-d H:i:s', $movTimestamp),
                        'sku' => $datos['sku'] ?? '',
                        'titulo' => $datos['titulo'] ?? '',
                        'tipo' => $datos['tipo'] ?? 'salida',
                        'cantidad' => $datos['cantidad'] ?? 0,
                        'stock_anterior' => $datos['stock_anterior'] ?? 0,
                        'stock_nuevo' => $datos['stock_nuevo'] ?? 0,
                        'usuario' => $datos['usuario'] ?? 'Sistema',
                        'motivo' => $datos['motivo'] ?? ''
                    ];
                }
            }
            
            http_response_code(200);
            echo json_encode(['movimientos' => $movimientos]);
            exit;
            
        } catch (Exception $e) {
            error_log('Reportes GET movimientos error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Error al consultar: ' . $e->getMessage()]);
            exit;
        }
    }
    
    // POST: Crear movimiento manual
    elseif ($metodo === 'POST') {
        $sku = $datos['sku'] ?? '';
        $tipo = $datos['tipo'] ?? 'entrada'; // 'entrada' o 'salida'
        $cantidad = intval($datos['cantidad'] ?? 0);
        $usuario = $datos['usuario'] ?? 'Sistema';
        $motivo = $datos['motivo'] ?? '';
        
        if (empty($sku) || $cantidad <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'SKU y cantidad válidos requeridos']);
            exit;
        }
        
        try {
            // Obtener producto actual
            $docProducto = $db->collection('productos')->document($sku)->snapshot();
            
            if (!$docProducto->exists()) {
                http_response_code(404);
                echo json_encode(['error' => 'Producto no encontrado']);
                exit;
            }
            
            $producto = $docProducto->data();
            $stockAnterior = intval($producto['Stock'] ?? 0);
            
            // Calcular nuevo stock
            if ($tipo === 'entrada') {
                $stockNuevo = $stockAnterior + $cantidad;
            } else {
                $stockNuevo = $stockAnterior - $cantidad;
                if ($stockNuevo < 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Stock insuficiente']);
                    exit;
                }
            }
            
            // Actualizar stock del producto
            $db->collection('productos')->document($sku)->set([
                'Stock' => $stockNuevo
            ], ['merge' => true]);
            
            // Registrar movimiento
            $idMovimiento = 'MOV-' . date('YmdHis') . '-' . rand(1000, 9999);
            $db->collection('movimientos')->document($idMovimiento)->set([
                'sku' => $sku,
                'titulo' => $producto['Titulo'] ?? $sku,
                'tipo' => $tipo,
                'cantidad' => $cantidad,
                'stock_anterior' => $stockAnterior,
                'stock_nuevo' => $stockNuevo,
                'usuario' => $usuario,
                'motivo' => $motivo,
                'timestamp' => time(),
                'fecha' => (new DateTime('now', new DateTimeZone('America/Santiago')))->format('Y-m-d H:i:s')
            ]);
            
            http_response_code(200);
            echo json_encode([
                'mensaje' => 'Movimiento registrado correctamente',
                'id' => $idMovimiento,
                'stock_nuevo' => $stockNuevo
            ]);
            exit;
            
        } catch (Exception $e) {
            error_log('Reportes POST movimientos error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar: ' . $e->getMessage()]);
            exit;
        }
    }
}

// ============================================
// RUTA: /api/reportes/ventas
// ============================================

elseif (strpos($subruta, '/ventas') === 0) {
    
    if ($metodo === 'GET') {
        $fechaInicio = $_GET['inicio'] ?? '';
        $fechaFin = $_GET['fin'] ?? '';
        
        if (empty($fechaInicio) || empty($fechaFin)) {
            http_response_code(400);
            echo json_encode(['error' => 'Fechas de inicio y fin requeridas']);
            exit;
        }
        
        try {
            // Convertir fechas a timestamp
            $inicioTimestamp = strtotime($fechaInicio . ' 00:00:00');
            $finTimestamp = strtotime($fechaFin . ' 23:59:59');
            
            if ($inicioTimestamp === false || $finTimestamp === false) {
                http_response_code(400);
                echo json_encode(['error' => 'Formato de fecha inválido (usa YYYY-MM-DD)']);
                exit;
            }
            
            // Consultar Firebase
            $documentos = $db->collection('ventas')
                ->orderBy('timestamp', 'DESC')
                ->documents();
            
            $ventas = [];
            $totalMonto = 0;
            $productosVendidos = [];
            
            foreach ($documentos as $doc) {
                if (!$doc->exists()) continue;
                
                $datosVenta = $doc->data();
                $ventaTimestamp = $datosVenta['timestamp'] ?? strtotime($datosVenta['fecha'] ?? '');
                
                // Filtrar por rango de fechas
                if ($ventaTimestamp >= $inicioTimestamp && $ventaTimestamp <= $finTimestamp) {
                    $total = floatval($datosVenta['total'] ?? 0);
                    
                    $ventas[] = [
                        'id' => $doc->id(),
                        'fecha' => $datosVenta['fecha'] ?? '',
                        'email_usuario' => $datosVenta['email_usuario'] ?? '',
                        'total' => $total,
                        'items' => $datosVenta['items'] ?? []
                    ];
                    
                    $totalMonto += $total;
                    
                    // Contabilizar productos vendidos
                    foreach ($datosVenta['items'] ?? [] as $item) {
                        $sku = $item['sku'] ?? '';
                        $cantidad = intval($item['cantidad'] ?? 0);
                        $subtotal = floatval($item['subtotal'] ?? 0);
                        $titulo = $item['titulo'] ?? $sku;
                        
                        if (!isset($productosVendidos[$sku])) {
                            $productosVendidos[$sku] = [
                                'sku' => $sku,
                                'titulo' => $titulo,
                                'cantidad_vendida' => 0,
                                'total_generado' => 0
                            ];
                        }
                        
                        $productosVendidos[$sku]['cantidad_vendida'] += $cantidad;
                        $productosVendidos[$sku]['total_generado'] += $subtotal;
                    }
                }
            }
            
            // Calcular promedio
            $promedio = count($ventas) > 0 ? $totalMonto / count($ventas) : 0;
            
            // Ordenar productos por cantidad vendida
            usort($productosVendidos, function($a, $b) {
                return $b['cantidad_vendida'] - $a['cantidad_vendida'];
            });
            
            // Top 10
            $productosTop = array_slice($productosVendidos, 0, 10);
            
            // Producto más vendido
            $productoMasVendido = count($productosTop) > 0 ? $productosTop[0]['titulo'] : null;
            
            http_response_code(200);
            echo json_encode([
                'ventas' => $ventas,
                'total_monto' => $totalMonto,
                'promedio' => $promedio,
                'cantidad_ventas' => count($ventas),
                'productos_top' => $productosTop,
                'producto_mas_vendido' => $productoMasVendido
            ]);
            exit;
            
        } catch (Exception $e) {
            error_log('Reportes GET ventas error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Error al consultar: ' . $e->getMessage()]);
            exit;
        }
    }
}

else {
    http_response_code(404);
    echo json_encode(['error' => 'Ruta de reporte no encontrada']);
    exit;
}

?>
