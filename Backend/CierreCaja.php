<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/Config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Obtener resumen de ventas del día
        $fechaHoy = date('Y-m-d');
        
        // Verificar si ya existe un cierre para hoy
        $stmt = $pdo->prepare("
            SELECT id FROM cierres_caja 
            WHERE DATE(fecha_cierre) = ?
            LIMIT 1
        ");
        $stmt->execute([$fechaHoy]);
        $cierreExistente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 1. Obtener resumen por método de pago
        $stmt = $pdo->prepare("
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad_ventas,
                SUM(total) as total
            FROM ventas
            WHERE DATE(fecha) = ?
            GROUP BY metodo_pago
        ");
        $stmt->execute([$fechaHoy]);
        $resumenMetodos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Obtener total general
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_ventas,
                SUM(total) as total_general
            FROM ventas
            WHERE DATE(fecha) = ?
        ");
        $stmt->execute([$fechaHoy]);
        $totales = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 3. Obtener detalle de todas las ventas del día
        $stmt = $pdo->prepare("
            SELECT 
                v.id,
                v.fecha as fecha_hora,
                v.total as monto_total,
                v.metodo_pago,
                v.items as detalle_productos
            FROM ventas v
            WHERE DATE(v.fecha) = ?
            ORDER BY v.fecha DESC
        ");
        $stmt->execute([$fechaHoy]);
        $ventasDelDia = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formatear nombres de métodos de pago
        $nombresMetodos = [
            'mercado_pago' => 'Mercado Pago',
            'debito' => 'Débito',
            'credito' => 'Crédito',
            'efectivo' => 'Efectivo'
        ];
        
        foreach ($resumenMetodos as &$metodo) {
            $metodo['nombre'] = $nombresMetodos[$metodo['metodo_pago']] ?? $metodo['metodo_pago'];
            $metodo['total'] = number_format($metodo['total'], 0, ',', '.');
        }
        
        echo json_encode([
            'fecha' => $fechaHoy,
            'total_ventas' => (int)$totales['total_ventas'],
            'total_general' => number_format($totales['total_general'] ?? 0, 0, ',', '.'),
            'total_general_numero' => $totales['total_general'] ?? 0,
            'resumen_metodos' => $resumenMetodos,
            'ventas' => $ventasDelDia,
            'cierre_realizado' => $cierreExistente ? true : false
        ]);
        
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Registrar cierre de caja
        $input = json_decode(file_get_contents('php://input'), true);
        $usuario_id = $input['usuario_id'] ?? null;
        
        if (!$usuario_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Usuario no especificado']);
            exit;
        }
        
        $fechaHoy = date('Y-m-d');
        
        // Calcular totales del día
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_ventas,
                SUM(total) as total_monto
            FROM ventas
            WHERE DATE(fecha) = ?
        ");
        $stmt->execute([$fechaHoy]);
        $totales = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Verificar si ya existe un cierre para hoy
        $stmt = $pdo->prepare("
            SELECT id FROM cierres_caja 
            WHERE DATE(fecha_cierre) = ?
            LIMIT 1
        ");
        $stmt->execute([$fechaHoy]);
        $cierreExistente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($cierreExistente) {
            http_response_code(400);
            echo json_encode(['error' => 'Ya existe un cierre de caja para el día de hoy']);
            exit;
        }
        
        // Registrar el cierre
        $stmt = $pdo->prepare("
            INSERT INTO cierres_caja (
                usuario_id, 
                fecha_cierre, 
                total_ventas, 
                monto_total
            ) VALUES (?, NOW(), ?, ?)
        ");
        $stmt->execute([
            $usuario_id,
            $totales['total_ventas'],
            $totales['total_monto']
        ]);
        
        echo json_encode([
            'exito' => true,
            'mensaje' => 'Cierre de caja registrado correctamente',
            'cierre_id' => $pdo->lastInsertId()
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]);
}
