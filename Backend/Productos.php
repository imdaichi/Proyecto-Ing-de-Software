<?php
// Backend/Productos.php
if (!isset($pdo)) exit;

// GET: LISTAR O BUSCAR
if ($metodo === 'GET') {
    global $partes; 
    $skuUrl = $partes[1] ?? null;

    if ($skuUrl) {
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE sku = ?");
        $stmt->execute([$skuUrl]);
        $p = $stmt->fetch();
        if($p) {
            // Mapeo para el Frontend
            $p['Titulo'] = $p['titulo'];
            $p['Stock'] = $p['stock'];
            $p['Precio Venta'] = $p['precio_venta']; // <--- CAMBIO AQUÍ
            $p['id_sku_en_db'] = $p['sku'];
            echo json_encode($p);
        } else {
            http_response_code(404); echo json_encode(['error'=>'No existe']);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM productos WHERE estado='activo'");
        $raw = $stmt->fetchAll();
        $final = [];
        foreach($raw as $p){
            // Mapeo para el Frontend
            $p['Titulo'] = $p['titulo'];
            $p['Stock'] = $p['stock'];
            $p['Precio Venta'] = $p['precio_venta']; // <--- CAMBIO AQUÍ
            $p['id_sku_en_db'] = $p['sku'];
            $final[]=$p;
        }
        echo json_encode($final);
    }
}

// POST: ACTUALIZAR O CREAR
if ($metodo === 'POST') {
    $sku = $datos['sku'] ?? null;
    if(!$sku){ http_response_code(400); echo json_encode(['error'=>'Falta SKU']); exit;}

    try {
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE sku=?");
        $stmt->execute([$sku]);
        $actual = $stmt->fetch();

        if(!$actual) { 
            // Si no existe, podrías crearlo aquí, pero por ahora devolvemos error 404
            http_response_code(404); echo json_encode(['error'=>'Producto no encontrado']); exit;
        }

        $nStock = isset($datos['nuevo_stock']) ? (int)$datos['nuevo_stock'] : null;
        
        // El frontend sigue enviando "precio", pero nosotros guardamos en "precio_venta"
        $nPrecio = isset($datos['precio']) ? (int)$datos['precio'] : null; 
        
        $user = $datos['usuario'] ?? 'Admin';
        
        // Bitácora
        $sqlMov = "INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())";
        $stmtMov = $pdo->prepare($sqlMov);

        // 1. Cambio de Stock
        if($nStock !== null && $nStock !== $actual['stock']) {
            $tipo = $nStock > $actual['stock'] ? 'entrada' : 'salida';
            $det = "Stock: <b>{$actual['stock']}</b> ➝ <b>$nStock</b>";
            $stmtMov->execute([$sku, $actual['titulo'], $tipo, $det, $user]);
            
            $pdo->prepare("UPDATE productos SET stock=? WHERE sku=?")->execute([$nStock, $sku]);
        }

        // 2. Cambio de Precio (Usando precio_venta)
        if($nPrecio !== null && $nPrecio !== $actual['precio_venta']) { // <--- CAMBIO AQUÍ
            $det = "Precio: $<b>{$actual['precio_venta']}</b> ➝ $<b>$nPrecio</b>";
            $stmtMov->execute([$sku, $actual['titulo'], 'precio', $det, $user]);
            
            // Actualizar tabla productos columna precio_venta
            $pdo->prepare("UPDATE productos SET precio_venta=? WHERE sku=?")->execute([$nPrecio, $sku]);
        }
        
        echo json_encode(['mensaje'=>'OK']);

    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
?>