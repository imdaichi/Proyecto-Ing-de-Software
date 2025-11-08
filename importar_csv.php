<?php
// importar_csv.php (VERSIÓN 2.2 - Corrección de UTF-8)

require 'firebase.php';
require 'vendor/autoload.php';

// --- Configuración ---
$archivoCsv = 'CimehijoDB.csv'; 
$coleccionDestino = 'productos'; 
$delimitador = ','; 
// ---------------------

echo "Iniciando la importación (Firestore, v2.2-UTF8) de $archivoCsv...\n";

global $db;
if (is_null($db)) {
    die("Error: La variable \$db (Firestore) no está definida. Revisa firebase.php\n");
}
$collectionRef = $db->collection($coleccionDestino);

if (($gestor = fopen($archivoCsv, "r")) === FALSE) {
    die("Error: No se pudo abrir el archivo CSV: $archivoCsv.\n");
}

// 4. Leer la fila de Encabezados (Headers)
// (NO USAMOS stream_filter_append aquí)
$headers = fgetcsv($gestor, 0, $delimitador);
if ($headers === FALSE) {
    die("Error: No se pudo leer la cabecera del CSV.\n");
}

// Limpiamos los headers
$headers_limpios = [];
foreach ($headers as $h) {
    $bom = pack('H*','EFBBBF');
    $h = preg_replace("/^$bom/", '', $h);
    $headers_limpios[] = trim($h);
}
$num_columnas = count($headers_limpios);
echo "Cabeceras detectadas ($num_columnas): " . implode(' | ', $headers_limpios) . "\n\n";

// 5. Leer el resto del archivo (los productos)
$fila = 1; 
$importados = 0;

while (($datos = fgetcsv($gestor, 0, $delimitador)) !== FALSE) {
    $fila++;
    
    // ++++++ ¡LA SOLUCIÓN ESTÁ AQUÍ! ++++++
    // Convertimos CADA DATO a UTF-8 antes de usarlos
    $datos_utf8 = [];
    foreach ($datos as $dato) {
        $datos_utf8[] = mb_convert_encoding($dato, 'UTF-8', 'Windows-1252');
    }
    // +++++++++++++++++++++++++++++++++++++++

    if (count($datos_utf8) != $num_columnas) {
        echo "Advertencia: Saltando fila $fila. El número de columnas (".count($datos_utf8).") no coincide con la cabecera ($num_columnas).\n";
        continue;
    }

    try {
        // Usamos los datos $datos_utf8 (ya convertidos)
        $producto = array_combine($headers_limpios, $datos_utf8);
    } catch (Exception $e) {
        echo "Error al combinar cabeceras en fila $fila: " . $e->getMessage() . "\n";
        continue;
    }

    $sku = trim($producto['SKU Padre y Variante']);
    if (empty($sku)) {
        echo "Advertencia: Saltando fila $fila. No hay SKU ('SKU Padre y Variante' está vacío).\n";
        continue;
    }

    // --- ¡Subir a FIRESTORE! ---
    try {
        $collectionRef->document($sku)->set($producto);
        $importados++;
        echo "."; // Imprimir un punto por cada éxito

    } catch (Exception $e) {
        // Si ALGO falla (SSL o lo que sea), el script se detendrá
        echo "\n\n¡ERROR FATAL AL ESCRIBIR EN FIRESTORE!\n";
        echo "===========================================\n";
        echo "Falló al intentar subir el SKU: $sku\n";
        echo "\n--- MENSAJE DE ERROR DE CONEXIÓN ---\n";
        echo $e->getMessage() . "\n";
        echo "-------------------------------------------\n";
        
        fclose($gestor);
        die(); // Detener el script
    }
}

fclose($gestor);

echo "\n\n--------------------------------------------------\n";
echo "¡Importación completada!\n";
echo "Total de filas leídas (incluyendo cabecera): $fila\n";
echo "Productos importados (o actualizados): $importados\n";

?>