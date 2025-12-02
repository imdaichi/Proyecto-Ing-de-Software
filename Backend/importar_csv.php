<?php
// Backend/ImportarCSV.php
require_once __DIR__ . '/Config/db.php';

// Descargar plantilla
if (isset($_GET['action']) && $_GET['action'] === 'template') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="plantilla_productos.csv"');
    $output = fopen('php://output', 'w');
    // Nota: En el CSV el usuario puede seguir viendo "precio" o "precio_venta", tú decides el encabezado
    fputcsv($output, ['sku', 'titulo', 'precio_venta', 'stock', 'variantes', 'estado']);
    fputcsv($output, ['PROD-001', 'Ejemplo', 1500, 100, 'Rojo', 'activo']);
    fclose($output);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['archivo_csv']) || $_FILES['archivo_csv']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400); echo json_encode(['error' => 'Error archivo']); exit;
    }

    $csvFile = fopen($_FILES['archivo_csv']['tmp_name'], 'r');
    if ($csvFile === false) { http_response_code(500); echo json_encode(['error' => 'No se lee archivo']); exit; }

    fgetcsv($csvFile); // Saltar cabecera

    $insertados = 0; $errores = 0;

    try {
        $pdo->beginTransaction();

        // CAMBIO AQUÍ: Usamos precio_venta
        $sql = "INSERT INTO productos (sku, titulo, precio_venta, stock, variantes, estado) 
                VALUES (?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                titulo = VALUES(titulo), 
                precio_venta = VALUES(precio_venta), 
                stock = VALUES(stock), 
                variantes = VALUES(variantes), 
                estado = VALUES(estado)";
        
        $stmt = $pdo->prepare($sql);

        while (($row = fgetcsv($csvFile, 1000, ",")) !== false) {
            if (count($row) < 4) { $errores++; continue; }

            $sku       = trim($row[0]);
            $titulo    = trim($row[1]);
            $precio    = (int)$row[2]; // Asumimos que es la columna 3 del CSV
            $stock     = (int)$row[3];
            $variantes = $row[4] ?? '';
            $estado    = $row[5] ?? 'activo';

            if (empty($sku)) { $errores++; continue; }

            $stmt->execute([$sku, $titulo, $precio, $stock, $variantes, $estado]);
            $insertados++;
        }

        $pdo->commit();
        fclose($csvFile);
        echo json_encode(['mensaje' => "Proceso OK", 'procesados' => $insertados, 'errores' => $errores]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
    }
}
?>