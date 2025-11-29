<?php
// ============================================
// REPORTES.PHP - Reportes de Ventas Inteligentes
// ============================================

if (!isset($db)) {
    http_response_code(500); echo json_encode(['error' => 'Error de conexión']); exit;
}

if ($metodo === 'GET') {
    // 1. Obtener fechas de la URL
    $inicio = $_GET['inicio'] ?? null;
    $fin = $_GET['fin'] ?? null;

    if (!$inicio || !$fin) {
        http_response_code(400); echo json_encode(['error' => 'Faltan fechas']); exit;
    }

    try {
        // TRUCO IMPORTANTE: 
        // Agregamos las horas para cubrir el día completo.
        // Ejemplo: Si buscas el día 10, buscas desde el 10 a las 00:00 hasta el 10 a las 23:59
        $fechaInicio = $inicio . " 00:00:00";
        $fechaFin = $fin . " 23:59:59";

        $ventasRef = $db->collection('ventas');
        
        // Hacemos la consulta filtrando por fecha (formato String ISO)
        $query = $ventasRef->where('fecha', '>=', $fechaInicio)
                        ->where('fecha', '<=', $fechaFin);
        
        $docs = $query->documents();
        
        $ventas = [];
        $totalGeneral = 0;
        
        foreach ($docs as $doc) {
            if ($doc->exists()) {
                $v = $doc->data();
                $v['id_venta'] = $doc->id();
                
                // Asegurar que los items sean un array
                if (!isset($v['items']) || !is_array($v['items'])) {
                    $v['items'] = [];
                }

                // Sumar al total general
                $totalGeneral += (int)($v['total'] ?? 0);
                
                $ventas[] = $v;
            }
        }

        // Ordenar ventas: Las más nuevas primero
        usort($ventas, function($a, $b) {
            return strtotime($b['fecha']) - strtotime($a['fecha']);
        });

        http_response_code(200);
        echo json_encode([
            'total_monto' => $totalGeneral,
            'cantidad_ventas' => count($ventas),
            'ventas' => $ventas
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al generar reporte: ' . $e->getMessage()]);
    }
}
?>