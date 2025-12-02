<?php
// Backend/Productos.php
require_once __DIR__ . '/Config/db.php';
// Parche de compatibilidad por si usas $db en vez de $pdo
if (!isset($pdo) && isset($db)) { $pdo = $db; }

// --- GET: OBTENER DATOS (Sin cambios) ---
if ($metodo === 'GET') {
    global $partes; $skuUrl = $partes[1] ?? null;
    if ($skuUrl) {
        $skuUrl = urldecode($skuUrl);
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE sku = ?");
        $stmt->execute([$skuUrl]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        if($p) {
            $p['Titulo']=$p['titulo']; $p['Stock']=$p['stock']; $p['Precio Venta']=$p['precio_venta']; $p['id_sku_en_db']=$p['sku'];
            echo json_encode($p);
        } else { http_response_code(404); echo json_encode(['error'=>'No existe']); }
    } else {
        $stmt = $pdo->query("SELECT * FROM productos WHERE estado='activo'");
        $raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $final = [];
        foreach($raw as $p){
            $p['Titulo']=$p['titulo']; $p['Stock']=$p['stock']; $p['Precio Venta']=$p['precio_venta']; $p['id_sku_en_db']=$p['sku'];
            $final[]=$p;
        }
        echo json_encode($final);
    }
}

// --- POST: GUARDAR CAMBIOS CON DETALLE EXACTO ---
if ($metodo === 'POST') {
    $sku = $datos['sku'] ?? null;
    if(!$sku){ http_response_code(400); echo json_encode(['error'=>'Falta SKU']); exit;}

    try {
        // 1. OBTENER EL PRODUCTO "VIEJO" (Tal como está ahora en la BD)
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE sku=?");
        $stmt->execute([$sku]);
        $viejo = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$viejo) { http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit;}

        // 2. OBTENER EL PRODUCTO "NUEVO" (Lo que enviaste desde el formulario)
        // Si no enviaste un campo, asumimos que se queda igual
        $nTitulo    = $datos['titulo'] ?? $viejo['titulo'];
        $nPrecio    = isset($datos['precio']) ? (int)$datos['precio'] : $viejo['precio_venta'];
        $nStock     = isset($datos['nuevo_stock']) ? (int)$datos['nuevo_stock'] : $viejo['stock'];
        $nVariantes = $datos['variantes'] ?? $viejo['variantes'];
        $nDesc      = $datos['descripcion'] ?? $viejo['descripcion'];
        $nCat       = $datos['categoria'] ?? $viejo['categoria'];
        
        $user = $datos['usuario'] ?? 'Admin Web';
        
        // 3. COMPARAR CAMPO POR CAMPO (AQUÍ ESTÁ LA MAGIA)
        $cambios = [];
        $tipoMov = 'edicion'; // Color gris/azul por defecto

        // A. Comparar TITULO
        if ($nTitulo !== $viejo['titulo']) {
            $cambios[] = "Título: <b>{$viejo['titulo']}</b> ➝ <b>$nTitulo</b>";
        }

        // B. Comparar VARIANTE
        if ($nVariantes !== $viejo['variantes']) {
            $vOld = $viejo['variantes'] ?: 'N/A';
            $vNew = $nVariantes ?: 'N/A';
            $cambios[] = "Variante: <b>$vOld</b> ➝ <b>$vNew</b>";
        }

        // C. Comparar DESCRIPCIÓN
        if ($nDesc !== $viejo['descripcion']) {
            // Como la descripción es larga, solo avisamos que cambió, o mostramos un resumen
            $cambios[] = "📝 Descripción Modificada";
        }

        // D. Comparar STOCK
        if ($nStock != $viejo['stock']) {
            $tipoMov = $nStock > $viejo['stock'] ? 'entrada' : 'salida'; // Cambia a verde o rojo
            $cambios[] = "Stock: <b>{$viejo['stock']}</b> ➝ <b>$nStock</b>";
        }

        // E. Comparar PRECIO
        if ($nPrecio != $viejo['precio_venta']) {
            $tipoMov = 'precio'; // Color naranja
            $cambios[] = "Precio: $<b>{$viejo['precio_venta']}</b> ➝ $<b>$nPrecio</b>";
        }

        // 4. SI HUBO CAMBIOS, GUARDARLOS
        if (!empty($cambios)) {
            // Unimos todos los mensajes con un salto de línea (<br>)
            $detalleFinal = implode('<br>', $cambios); 
            
            // a) Insertar en Bitácora
            $sqlMov = "INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())";
            $pdo->prepare($sqlMov)->execute([$sku, $nTitulo, $tipoMov, $detalleFinal, $user]);

            // b) Actualizar Producto en la BD
            $sqlUpd = "UPDATE productos SET titulo=?, precio_venta=?, stock=?, variantes=?, descripcion=?, categoria=? WHERE sku=?";
            $pdo->prepare($sqlUpd)->execute([$nTitulo, $nPrecio, $nStock, $nVariantes, $nDesc, $nCat, $sku]);
            
            echo json_encode(['mensaje'=>'Cambios registrados en bitácora']);
        } else {
            echo json_encode(['mensaje'=>'No detecté cambios para guardar']);
        }

    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
?>