<?php
require_once __DIR__ . '/Config/db.php';
require_once __DIR__ . '/Cache.php';

if (!isset($pdo) && isset($db)) { $pdo = $db; }

header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(['error' => 'No hay conexión a BD']);
    exit;
}

if ($metodo === 'GET') {
    try {
        // Intentar obtener del caché (5 minutos)
        $rankingMetodos = $cache->get('ranking_metodos_pago');
        
        if ($rankingMetodos === null) {
            // No está en caché, calcular
            $sqlVentas = "SELECT metodo_pago FROM ventas";
            $todasVentas = $pdo->query($sqlVentas)->fetchAll(PDO::FETCH_ASSOC);
            
            $ventasPorMetodo = [];
            
            foreach ($todasVentas as $v) {
                $metodo = strtolower(trim($v['metodo_pago'] ?? 'desconocido'));
                $metodo = str_replace(['á','é','í','ó','ú'], ['a','e','i','o','u'], $metodo);

                $esMercadoPago = str_contains($metodo, 'mercado') || str_contains($metodo, 'mp') || str_contains($metodo, 'mercadopago');
                $esDebito = str_contains($metodo, 'debito') || str_contains($metodo, 'tdd') || str_contains($metodo, 'deb');
                $esCredito = str_contains($metodo, 'credito') || str_contains($metodo, 'tdc') || str_contains($metodo, 'cred') || $metodo === 'tarjeta' || $metodo === 'tarjetas';

                $etiquetaMetodo = match(true) {
                    $esMercadoPago => 'Mercado Pago',
                    $esDebito => 'Débito',
                    $esCredito => 'Crédito',
                    str_contains($metodo, 'efectivo') => 'Efectivo',
                    default => ucfirst($metodo ?: 'Desconocido')
                };
                
                if (!isset($ventasPorMetodo[$etiquetaMetodo])) {
                    $ventasPorMetodo[$etiquetaMetodo] = 0;
                }
                $ventasPorMetodo[$etiquetaMetodo] += 1;
            }
            
            arsort($ventasPorMetodo);
            
            $rankingMetodos = [
                'total_transacciones' => array_sum($ventasPorMetodo),
                'metodos' => $ventasPorMetodo
            ];
            
            // Guardar en caché (5 minutos)
            $cache->set('ranking_metodos_pago', $rankingMetodos, 300);
        }
        
        echo json_encode($rankingMetodos, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    }
}
?>
