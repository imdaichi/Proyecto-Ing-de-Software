<?php
// ============================================
// MOVIMIENTOS.PHP - Historial Global y Por Producto
// ============================================

if (!isset($db)) {
    http_response_code(500); echo json_encode(['error' => 'Error BD']); exit;
}

if ($metodo === 'GET') {
    $sku = $_GET['sku'] ?? null; // Ahora es opcional

    try {
        $movRef = $db->collection('movimientos');
        
        if ($sku) {
            // CASO 1: Filtrar por SKU específico
            $query = $movRef->where('sku', '==', $sku);
            $docs = $query->documents();
        } else {
            // CASO 2: Traer TODO (Global)
            // Nota: Traemos todo y ordenamos en PHP para evitar errores de índices en Firebase
            $docs = $movRef->documents();
        }
        
        $historial = [];
        
        foreach ($docs as $doc) {
            if ($doc->exists()) {
                $data = $doc->data();
                $data['id_mov'] = $doc->id();
                $historial[] = $data;
            }
        }

        // Ordenar por fecha DESCENDENTE (Lo más nuevo primero)
        usort($historial, function($a, $b) {
            $f1 = strtotime($a['fecha'] ?? 'now');
            $f2 = strtotime($b['fecha'] ?? 'now');
            return $f2 - $f1; 
        });

        // Si es global (sin SKU), limitamos a los últimos 30 para no saturar
        if (!$sku) {
            $historial = array_slice($historial, 0, 30);
        }

        http_response_code(200);
        echo json_encode($historial);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    }
}
?>