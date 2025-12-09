<?php

require_once __DIR__ . '/Config/db.php';

if (!isset($pdo) && isset($db)) {
    $pdo = $db;
}

if (!isset($pdo)) {
    http_response_code(500); echo json_encode(['error' => 'Error: No hay conexión a BD']); exit;
}

if ($metodo === 'GET') {
    try {
        $sku = $_GET['sku'] ?? null;

        if ($sku) {
            $stmt = $pdo->prepare("SELECT * FROM movimientos WHERE sku = ? ORDER BY fecha DESC");
            $stmt->execute([$sku]);
        } else {
            // Limitar a 800 para evitar carga masiva en frontend; el paginador ya muestra 10 por página
            $stmt = $pdo->query("SELECT * FROM movimientos ORDER BY fecha DESC LIMIT 800");
        }

        $movs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($movs);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error SQL: ' . $e->getMessage()]);
    }
}
?>