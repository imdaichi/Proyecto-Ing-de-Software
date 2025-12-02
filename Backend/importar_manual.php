<?php
// ==========================================
// Backend/importar_manual.php
// Script BLINDADO para caracteres especiales en SKU y Textos
// ==========================================

require_once __DIR__ . '/Config/db.php';

// Parche de compatibilidad
if (!isset($pdo) && isset($db)) { $pdo = $db; }
if (!isset($pdo)) { die("❌ Error: No hay conexión a la base de datos."); }

$archivoCSV = __DIR__ . '/CimehijoDB.csv';

echo "<h1>🚀 Importación Manual (Corrección Total UTF-8)</h1>";

if (!file_exists($archivoCSV)) {
    die("❌ Error: Falta el archivo <b>CimehijoDB.csv</b> en la carpeta Backend.");
}

$handle = fopen($archivoCSV, "r");
if ($handle === false) { die("❌ Error al abrir CSV."); }

try {
    $pdo->beginTransaction();

    $sql = "INSERT INTO productos (sku, titulo, precio_venta, stock, variantes, estado) 
            VALUES (?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            titulo = VALUES(titulo), 
            precio_venta = VALUES(precio_venta), 
            stock = VALUES(stock), 
            variantes = VALUES(variantes), 
            estado = VALUES(estado)";

    $stmt = $pdo->prepare($sql);

    // Saltar encabezados
    fgetcsv($handle);

    $fila = 0;
    $insertados = 0;

    echo "<pre>";

    while (($datos = fgetcsv($handle, 2000, ",")) !== false) {
        $fila++;

        if (count($datos) < 5) continue;

        // ========================================================
        // 🛠️ CORRECCIÓN APLICADA A TODO (SKU INCLUIDO)
        // ========================================================
        
        // 1. SKU (Aquí estaba el error \xD1)
        $sku = mb_convert_encoding(trim($datos[0]), 'UTF-8', 'ISO-8859-1');
        
        // 2. Título
        $titulo = mb_convert_encoding(trim($datos[1]), 'UTF-8', 'ISO-8859-1');
        
        // 3. Variantes
        $variantes = mb_convert_encoding(trim($datos[2]), 'UTF-8', 'ISO-8859-1');
        
        // 4. Números (Stock y Precio) - Quitamos puntos
        $stockRaw  = str_replace('.', '', $datos[3]);
        $precioRaw = str_replace('.', '', $datos[4]);
        
        $stock     = (int)$stockRaw;
        $precio    = (int)$precioRaw;

        // 5. Estado
        $estadoRaw = mb_convert_encoding(trim($datos[6] ?? ''), 'UTF-8', 'ISO-8859-1');
        $estado    = (stripos($estadoRaw, 'activa') !== false) ? 'activo' : 'inactivo';

        // Validación final
        if (empty($sku)) {
            echo "⚠️ Fila $fila saltada (SKU vacío)...\n";
            continue;
        }

        $stmt->execute([$sku, $titulo, $precio, $stock, $variantes, $estado]);
        $insertados++;
        
        if ($insertados % 50 == 0) echo "✅ Procesados $insertados...\n";
    }

    $pdo->commit();
    fclose($handle);

    echo "\n🎉 <b>¡ÉXITO TOTAL!</b>\n";
    echo "Se han importado <b>$insertados</b> productos correctamente.\n";
    echo "Ya puedes revisar tu Dashboard.";
    echo "</pre>";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "<h1>❌ ERROR CRÍTICO</h1>";
    echo "Detalle: " . $e->getMessage();
}
?>