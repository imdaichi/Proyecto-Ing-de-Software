<?php

if (!isset($pdo)) exit;

if ($metodo === 'GET') {
    try {
        // Obtener configuración actual
        $stmt = $pdo->query("SELECT dias_stock_bajo, dias_sin_ventas, dias_periodo_gracia FROM config_notificaciones WHERE id = 1");
        $config = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$config) {
            // Si no existe, crear con valores por defecto
            $pdo->exec("INSERT INTO config_notificaciones (id, dias_stock_bajo, dias_sin_ventas, dias_periodo_gracia) VALUES (1, 3, 80, 21)");
            $config = [
                'dias_stock_bajo' => 3,
                'dias_sin_ventas' => 80,
                'dias_periodo_gracia' => 21
            ];
        }
        
        echo json_encode([
            'exito' => true,
            'config' => $config
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} 
elseif ($metodo === 'POST') {
    try {
        $diasStockBajo = (int)($datos['dias_stock_bajo'] ?? 3);
        $diasSinVentas = (int)($datos['dias_sin_ventas'] ?? 80);
        $diasPeriodoGracia = (int)($datos['dias_periodo_gracia'] ?? 21);
        
        // Validar que los valores sean razonables
        if ($diasStockBajo < 1 || $diasStockBajo > 100) {
            throw new Exception('Días para stock bajo debe estar entre 1 y 100');
        }
        if ($diasSinVentas < 1 || $diasSinVentas > 365) {
            throw new Exception('Días sin ventas debe estar entre 1 y 365');
        }
        if ($diasPeriodoGracia < 0 || $diasPeriodoGracia > 365) {
            throw new Exception('Días período de gracia debe estar entre 0 y 365');
        }
        
        // Actualizar configuración
        $stmt = $pdo->prepare("
            UPDATE config_notificaciones 
            SET dias_stock_bajo = ?, dias_sin_ventas = ?, dias_periodo_gracia = ?
            WHERE id = 1
        ");
        $stmt->execute([$diasStockBajo, $diasSinVentas, $diasPeriodoGracia]);
        
        // Limpiar caché de notificaciones para que se recalcule con nuevos valores
        require_once __DIR__ . '/Cache.php';
        $cache->delete('notificaciones_productos');
        
        echo json_encode([
            'exito' => true,
            'mensaje' => 'Configuración actualizada correctamente',
            'config' => [
                'dias_stock_bajo' => $diasStockBajo,
                'dias_sin_ventas' => $diasSinVentas,
                'dias_periodo_gracia' => $diasPeriodoGracia
            ]
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
