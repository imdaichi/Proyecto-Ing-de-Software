<?php
/**
 * LimpiarCache.php - Endpoint para limpiar caché
 * Útil para forzar recalcular KPIs durante testing
 */

require_once __DIR__ . '/Cache.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = $_GET['accion'] ?? 'all';
    
    try {
        if ($accion === 'all') {
            // Limpiar todo el caché
            $cache->clear();
            echo json_encode([
                'exito' => true,
                'mensaje' => 'Caché completamente limpiado'
            ]);
        } else if ($accion === 'dashboard') {
            // Limpiar solo KPIs del dashboard
            $cache->delete('dashboard_kpis');
            echo json_encode([
                'exito' => true,
                'mensaje' => 'Caché del dashboard limpiado'
            ]);
        } else {
            // Limpiar caché específico
            $cache->delete($accion);
            echo json_encode([
                'exito' => true,
                'mensaje' => "Caché '$accion' limpiado"
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Solo POST permitido']);
}
?>
