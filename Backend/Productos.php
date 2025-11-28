<?php
// ============================================
// PRODUCTOS.PHP - Gestión (Con Precio y Variantes)
// ============================================

if (!isset($db)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión interna (db no definida)']);
    exit;
}

// ---------------------------------------------------------
// MÉTODO GET: BUSCAR PRODUCTO
// ---------------------------------------------------------
if ($metodo === 'GET') {
    try {
        $sku_buscado = $id_url ?? $_GET['sku'] ?? null;
        
        if (!$sku_buscado) {
            http_response_code(400);
            echo json_encode(['error' => 'Se requiere SKU']);
            exit;
        }
        
        $sku_limpio = trim($sku_buscado);
        
        // 1. Buscar por ID directo
        $docRef = $db->collection('productos')->document($sku_limpio);
        $snapshot = $docRef->snapshot();
        
        if ($snapshot->exists()) {
            $prod = $snapshot->data();
            $prod['id_sku_en_db'] = $snapshot->id();
            echo json_encode($prod);
            exit;
        }
        
        // 2. Buscar por campo (para variantes)
        $query = $db->collection('productos')->where('SKU Padre y Variante', '==', $sku_buscado);
        $docs = $query->documents();
        
        foreach ($docs as $doc) {
            if ($doc->exists()) {
                $prod = $doc->data();
                $prod['id_sku_en_db'] = $doc->id();
                echo json_encode($prod);
                exit;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }
}

// ---------------------------------------------------------
// MÉTODO POST: ACTUALIZAR (Stock, Precio y Variantes)
// ---------------------------------------------------------
if ($metodo === 'POST') {
    $sku = $datos['sku'] ?? null;
    $usuario = $datos['usuario'] ?? 'sistema';
    
    // Recibimos los nuevos datos (si existen)
    // Usamos isset para permitir el valor 0
    $nuevoStock = isset($datos['nuevo_stock']) ? intval($datos['nuevo_stock']) : null;
    $nuevoPrecio = isset($datos['precio']) ? intval($datos['precio']) : null;
    $nuevasVariantes = $datos['variantes'] ?? null;

    if (!$sku) {
        http_response_code(400);
        echo json_encode(['error' => 'Falta el SKU']);
        exit;
    }

    try {
        $docRef = $db->collection('productos')->document($sku);
        $snapshot = $docRef->snapshot();
        
        if (!$snapshot->exists()) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no existe']);
            exit;
        }

        $productoActual = $snapshot->data();
        $datosParaActualizar = []; // Lista de cambios a guardar

        // A. LÓGICA DE STOCK (Manteniendo tu historial de movimientos)
        if ($nuevoStock !== null) {
            $stockAnterior = intval($productoActual['Stock'] ?? 0);
            
            if ($stockAnterior !== $nuevoStock) {
                // Registrar movimiento en historial
                $diferencia = $nuevoStock - $stockAnterior;
                $tipo = $diferencia > 0 ? 'entrada' : 'salida';
                
                $db->collection('movimientos')->add([
                    'sku' => $sku,
                    'titulo' => $productoActual['Titulo'] ?? 'Sin Titulo',
                    'tipo' => $tipo,
                    'cantidad' => abs($diferencia),
                    'stock_anterior' => $stockAnterior,
                    'stock_nuevo' => $nuevoStock,
                    'usuario' => $usuario,
                    'fecha' => date('Y-m-d H:i:s'),
                    'timestamp' => time()
                ]);
                
                // Preparar dato para guardar
                $datosParaActualizar['Stock'] = $nuevoStock;
            }
        }

        // B. LÓGICA DE PRECIO (Nueva)
        if ($nuevoPrecio !== null) {
            // Guardamos en 'Precio Venta' como espera tu sistema
            $datosParaActualizar['Precio Venta'] = $nuevoPrecio;
        }

        // C. LÓGICA DE VARIANTES (Nueva)
        if ($nuevasVariantes !== null) {
            $datosParaActualizar['Variantes'] = $nuevasVariantes;
        }

        // GUARDAR TODO JUNTO
        if (!empty($datosParaActualizar)) {
            // 'merge' => true evita borrar el Título u otros datos
            $docRef->set($datosParaActualizar, ['merge' => true]);
            
            http_response_code(200);
            echo json_encode(['mensaje' => 'Datos actualizados correctamente']);
        } else {
            http_response_code(200);
            echo json_encode(['mensaje' => 'No hubo cambios']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    }
}
?>