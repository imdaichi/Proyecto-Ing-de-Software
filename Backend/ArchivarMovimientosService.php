<?php
// Servicio reutilizable para archivar movimientos
// Exporta movimientos con más de $days días a CSV y los elimina de la tabla.
// Devuelve un array con: mensaje, archivo (o null), eliminados (int).

function archivarMovimientosService(PDO $pdo, int $days = 30): array {
    $cutoffDate = (new DateTime())->modify("-$days days")->format('Y-m-d H:i:s');

    // Obtener registros a archivar
    $sqlSelect = "SELECT * FROM movimientos WHERE fecha < ? ORDER BY fecha ASC";
    $stmt = $pdo->prepare($sqlSelect);
    $stmt->execute([$cutoffDate]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rows)) {
        return [
            'mensaje'    => 'Sin registros para archivar',
            'archivo'    => null,
            'eliminados' => 0,
        ];
    }

    // Preparar CSV
    $dir = __DIR__ . '/Registro_movimientos';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $fileName = 'bitacora-' . date('Y-m-d_H-i-s') . '.csv';
    $filePath = $dir . '/' . $fileName;

    $fp = fopen($filePath, 'w');
    if ($fp === false) {
        throw new Exception('No se pudo crear el archivo CSV');
    }

    // Encabezados
    fputcsv($fp, array_keys($rows[0]));
    foreach ($rows as $r) {
        fputcsv($fp, $r);
    }
    fclose($fp);

    // Eliminar registros archivados
    $sqlDelete = "DELETE FROM movimientos WHERE fecha < ?";
    $stmtDel = $pdo->prepare($sqlDelete);
    $stmtDel->execute([$cutoffDate]);

    return [
        'mensaje'    => 'Archivado y limpieza completados',
        'archivo'    => 'Registro_movimientos/' . $fileName,
        'eliminados' => count($rows),
    ];
}
