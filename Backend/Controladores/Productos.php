<?php
// Controladores/productos.php

// Usamos las variables globales definidas en index.php
global $db, $metodo, $datos; 

header('Content-Type: application/json');

// --- OPCIÓN 1: MÉTODO GET (Buscar productos) ---
if ($metodo == 'GET') {
    try {
        // 1. Verificamos que SÍ nos enviaron un SKU y que NO está vacío
        if (isset($_GET['sku']) && !empty($_GET['sku'])) {
            
            // --- Buscar por SKU ---
            $sku_buscado = $_GET['sku'];
            // (Tu lógica de limpiar el SKU)
            $sku_limpio = str_replace('/', '-', $sku_buscado);
            $sku_limpio = str_replace('\\', '-', $sku_limpio); 

            $docRef = $db->collection('productos')->document($sku_limpio);
            $snapshot = $docRef->snapshot();

            if ($snapshot->exists()) {
                $producto = $snapshot->data();
                $producto['id_sku_en_db'] = $snapshot->id();
                echo json_encode($producto);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Producto no encontrado con el SKU: ' . $sku_buscado]);
            }

        } else {
            // --- ¡¡ESTA ES LA SOLUCIÓN!! ---
            // Si no se provee un SKU, no busques nada y devuelve un error.
            http_response_code(400); // 400 = Bad Request
            echo json_encode(['error' => 'Se requiere un SKU para la búsqueda.']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al leer productos: ' . $e->getMessage()]);
    }
}
// --- ¡NUEVA OPCIÓN! MÉTODO POST (Actualizar producto) ---
else if ($metodo == 'POST') {
    try {
        // Obtenemos el SKU y los datos nuevos del frontend
        $sku = $datos['sku'] ?? null;
        $nuevosDatos = $datos['data'] ?? [];

        if (!$sku || empty($nuevosDatos)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Faltan el SKU o los datos para actualizar']);
            exit();
        }

        // Preparamos los datos para Firestore
        // (Ej: $nuevosDatos = {"Precio Venta": "25000", "Stock": "10"})
        $updates = [];
        foreach ($nuevosDatos as $campo => $valor) {
            $updates[] = [
                'path' => $campo,
                'value' => $valor
            ];
        }

        // Actualizamos el documento en Firestore
        $docRef = $db->collection('productos')->document($sku);
        $docRef->update($updates);

        http_response_code(200);
        echo json_encode(['mensaje' => 'Producto actualizado con éxito', 'sku' => $sku]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar producto: ' . $e->getMessage()]);
    }
}
// --- Si no es GET o POST ---
else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Método no permitido para productos']);
}
?>