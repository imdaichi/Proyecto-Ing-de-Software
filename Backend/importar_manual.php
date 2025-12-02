<?php
// Backend/importarscv.php
require_once __DIR__ . '/Config/db.php';
if (!isset($pdo) && isset($db)) { $pdo = $db; }

$archivoLocal = __DIR__ . '/CimehijoDB.csv';

// Función para corregir tildes
function limpiarTexto($texto) {
    if (!$texto) return '';
    if (!mb_check_encoding($texto, 'UTF-8')) return mb_convert_encoding($texto, 'UTF-8', 'Windows-1252');
    return trim($texto);
}

// Encabezado visual si lo abres en navegador
echo "<body style='font-family: sans-serif; padding: 20px;'><h2>🔄 Sincronización Detallada</h2>";

try {
    if (!file_exists($archivoLocal)) { echo "❌ Falta CimehijoDB.csv"; exit; }
    
    $csvFile = fopen($archivoLocal, 'r');
    fgetcsv($csvFile); // Saltar cabecera

    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT * FROM productos WHERE sku = ?");
    // Queries de Insert/Update omitidos por brevedad, son los mismos de antes...
    $stmtInsert = $pdo->prepare("INSERT INTO productos (sku, titulo, variantes, stock, precio_venta, descripcion, estado, tipo_garantia, categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmtUpdate = $pdo->prepare("UPDATE productos SET titulo=?, variantes=?, stock=?, precio_venta=?, descripcion=?, estado=?, tipo_garantia=?, categoria=? WHERE sku=?");
    $stmtMov = $pdo->prepare("INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, proveedor, fecha) VALUES (?, ?, ?, ?, ?, ?, NOW())");

    $count = 0;

    while (($row = fgetcsv($csvFile, 2000, ",")) !== false) {
        if (count($row) < 5) continue;

        // Leer datos CSV
        $sku       = limpiarTexto($row[0]);
        $titulo    = limpiarTexto($row[1]);
        $variantes = limpiarTexto($row[2]);
        $stockNew  = (int)$row[3];
        $precioNew = (int)$row[4];
        $desc      = limpiarTexto($row[5] ?? '');
        $estado    = strtolower(limpiarTexto($row[6] ?? 'activa')) === 'activa' ? 'activo' : 'inactivo';
        $garantia  = limpiarTexto($row[7] ?? '');
        $categoria = limpiarTexto($row[8] ?? '');

        if (empty($sku)) continue;

        // 1. OBTENER DATOS ACTUALES DE BD
        $stmtCheck->execute([$sku]);
        $viejo = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($viejo) {
            // --- DETECTAR CAMBIOS ---
            $cambios = [];
            $tipoMov = 'edicion';

            // Comparamos lo que hay en BD vs lo que dice el CSV
            if ($viejo['titulo'] != $titulo) {
                $cambios[] = "Título: <b>{$viejo['titulo']}</b> ➝ <b>$titulo</b>";
            }
            if ($viejo['variantes'] != $variantes) {
                $vOld = $viejo['variantes'] ?: '-';
                $cambios[] = "Var: <b>$vOld</b> ➝ <b>$variantes</b>";
            }
            if ($viejo['stock'] != $stockNew) {
                $tipoMov = $stockNew > $viejo['stock'] ? 'entrada' : 'salida';
                $cambios[] = "Stock: <b>{$viejo['stock']}</b> ➝ <b>$stockNew</b>";
            }
            if ($viejo['precio_venta'] != $precioNew) {
                $cambios[] = "Precio: <b>{$viejo['precio_venta']}</b> ➝ <b>$precioNew</b>";
            }
            if ($viejo['descripcion'] != $desc) {
                $cambios[] = "📝 Descripción actualizada";
            }

            // Si hay diferencias, guardamos en bitácora
            if (!empty($cambios)) {
                $stmtMov->execute([$sku, $titulo, $tipoMov, implode('<br>', $cambios), 'Auto-Sync', 'CSV']);
            }

            // Actualizamos el producto siempre
            $stmtUpdate->execute([$titulo, $variantes, $stockNew, $precioNew, $desc, $estado, $garantia, $categoria, $sku]);
            
        } else {
            // Nuevo Producto
            $stmtInsert->execute([$sku, $titulo, $variantes, $stockNew, $precioNew, $desc, $estado, $garantia, $categoria]);
            $det = "Carga Inicial<br>Stock: 0 ➝ <b>$stockNew</b><br>Var: $variantes";
            $stmtMov->execute([$sku, $titulo, 'entrada', $det, 'Auto-Sync', 'CSV']);
        }
        $count++;
    }

    $pdo->commit();
    echo "✅ Sincronización terminada. $count productos procesados.";

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "❌ Error: " . $e->getMessage();
}
?>