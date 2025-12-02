<?php
// Backend/Movimientos.php
require_once __DIR__ . '/Config/db.php';

// PARCHE DE COMPATIBILIDAD:
// Si en tu db.php la variable se llama $db, la copiamos a $pdo para que el resto del código funcione.
if (!isset($pdo) && isset($db)) {
    $pdo = $db;
}

if (!isset($pdo)) {
    http_response_code(500); echo json_encode(['error' => 'Error: No hay conexión a BD']); exit;
}

// OBTENER MOVIMIENTOS
if ($metodo === 'GET') {
    try {
        $sku = $_GET['sku'] ?? null;

        if ($sku) {
            // Filtrar por producto específico
            $stmt = $pdo->prepare("SELECT * FROM movimientos WHERE sku = ? ORDER BY fecha DESC");
            $stmt->execute([$sku]);
        } else {
            // Traer los últimos 50 movimientos generales
            $stmt = $pdo->query("SELECT * FROM movimientos ORDER BY fecha DESC LIMIT 50");
        }

        $movs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($movs);

    } catch (Exception $e) {
        http_response_code(500); 
        echo json_encode(['error' => 'Error SQL: ' . $e->getMessage()]);
    }
}
?>