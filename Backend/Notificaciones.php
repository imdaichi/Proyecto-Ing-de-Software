<?php
// Backend/Notificaciones.php
if (!isset($pdo)) exit;

if ($metodo === 'GET') {
    try {
        // Productos con más de 80 días desde última entrada en movimientos
        // Buscar última entrada por SKU y calcular días
        $sql = "
            SELECT 
                p.sku,
                p.titulo,
                p.stock,
                p.categoria,
                MAX(m.fecha) as ultima_entrada,
                DATEDIFF(NOW(), MAX(m.fecha)) as dias_bodega
            FROM productos p
            LEFT JOIN movimientos m ON m.sku = p.sku AND m.tipo LIKE '%entrada%'
            WHERE p.estado = 'activo' AND p.stock > 0
            GROUP BY p.sku, p.titulo, p.stock, p.categoria
            HAVING dias_bodega > 80
            ORDER BY dias_bodega DESC
        ";
        
        $stmt = $pdo->query($sql);
        $alertas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
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
