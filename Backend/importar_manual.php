<?php

require_once __DIR__ . '/Config/db.php';
if (!isset($pdo) && isset($db)) { $pdo = $db; }

$archivoLocal = __DIR__ . '/CimehijoDB.csv';

// Determinar si se trata de una solicitud API o una solicitud directa
$esAPI = isset($metodo) && $metodo === 'GET';

function limpiarTexto($texto) {
    if (!$texto) return '';
    if (!mb_check_encoding($texto, 'UTF-8')) return mb_convert_encoding($texto, 'UTF-8', 'Windows-1252');
    return trim($texto);
}

if (!$esAPI) {
    echo "<body style='font-family: sans-serif; padding: 20px;'><h2>🔄 Sincronización Detallada</h2>";
}

try {
    if (!file_exists($archivoLocal)) { 
        if ($esAPI) {
            http_response_code(400);
            echo json_encode(['error' => 'Archivo CimehijoDB.csv no encontrado']);
        } else {
            echo "❌ Falta CimehijoDB.csv";
        }
        exit; 
    }
    
    $csvFile = fopen($archivoLocal, 'r');
    fgetcsv($csvFile);

    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT * FROM productos WHERE sku = ?");
    $stmtInsert = $pdo->prepare("INSERT INTO productos (sku, titulo, variantes, stock, precio_venta, descripcion, estado, tipo_garantia, categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmtUpdate = $pdo->prepare("UPDATE productos SET titulo=?, variantes=?, stock=?, precio_venta=?, descripcion=?, estado=?, tipo_garantia=?, categoria=? WHERE sku=?");
    $stmtMov = $pdo->prepare("INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, proveedor, fecha) VALUES (?, ?, ?, ?, ?, ?, NOW())");

    $count = 0;

    while (($row = fgetcsv($csvFile, 2000, ",")) !== false) {
        if (count($row) < 5) continue;

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

        $stmtCheck->execute([$sku]);
        $viejo = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($viejo) {
            $cambios = [];
            $tipoMov = 'edicion';

            if ($viejo['titulo'] != $titulo) {
                $cambios[] = "Título: <b>{$viejo['titulo']}</b> &rarr; <b>$titulo</b>";
            }
            if ($viejo['variantes'] != $variantes) {
                $vOld = $viejo['variantes'] ?: '-';
                $cambios[] = "Var: <b>$vOld</b> &rarr; <b>$variantes</b>";
            }
            if ($viejo['stock'] != $stockNew) {
                $tipoMov = $stockNew > $viejo['stock'] ? 'entrada' : 'salida';
                $cambios[] = "Stock: <b>{$viejo['stock']}</b> &rarr; <b>$stockNew</b>";
            }
            if ($viejo['precio_venta'] != $precioNew) {
                $cambios[] = "Precio: <b>{$viejo['precio_venta']}</b> &rarr; <b>$precioNew</b>";
            }
            if ($viejo['descripcion'] != $desc) {
                $cambios[] = "📝 Descripción actualizada";
            }

            if (!empty($cambios)) {
                $stmtMov->execute([$sku, $titulo, $tipoMov, implode('<br>', $cambios), 'Auto-Sync', 'CSV']);
            }

            $stmtUpdate->execute([$titulo, $variantes, $stockNew, $precioNew, $desc, $estado, $garantia, $categoria, $sku]);
            
        } else {
            $stmtInsert->execute([$sku, $titulo, $variantes, $stockNew, $precioNew, $desc, $estado, $garantia, $categoria]);
            $det = "Carga Inicial<br>Stock: 0 &rarr; <b>$stockNew</b><br>Var: $variantes";
            $stmtMov->execute([$sku, $titulo, 'entrada', $det, 'Auto-Sync', 'CSV']);
        }
        $count++;
    }

    $pdo->commit();
    
    if ($esAPI) {
        echo json_encode([
            'mensaje' => 'Sincronización completada',
            'productos_procesados' => $count
        ]);
    } else {
        echo "✅ Sincronización terminada. $count productos procesados.";
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    if ($esAPI) {
        http_response_code(500);
        echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    } else {
        echo "❌ Error: " . $e->getMessage();
    }
}
?>