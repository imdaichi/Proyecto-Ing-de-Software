<?php
require_once __DIR__ . '/Config/db.php';

if (!isset($pdo) && isset($db)) { $pdo = $db; }

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

if ($metodo === 'POST') {
    $sku = $datos['sku'] ?? null;
    if(!$sku){ http_response_code(400); echo json_encode(['error'=>'Falta SKU']); exit;}

    try {
        $stmt = $pdo->prepare("SELECT * FROM productos WHERE sku=?");
        $stmt->execute([$sku]);
        $viejo = $stmt->fetch(PDO::FETCH_ASSOC);

        if(!$viejo) { http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit;}

        $nTitulo    = $datos['titulo'] ?? $viejo['titulo'];
        $nPrecio    = isset($datos['precio']) ? (int)$datos['precio'] : $viejo['precio_venta'];
        $nStock     = isset($datos['nuevo_stock']) ? (int)$datos['nuevo_stock'] : $viejo['stock'];
        $nVariantes = $datos['variantes'] ?? $viejo['variantes'];
        $nDesc      = $datos['descripcion'] ?? $viejo['descripcion'];
        $nCat       = $datos['categoria'] ?? $viejo['categoria'];
        
        $user = $datos['usuario'] ?? 'Admin Web';
        

        $cambios = [];
        $tipoMov = 'edicion';

        if ($nTitulo !== $viejo['titulo']) {
            $cambios[] = "Título: <b>{$viejo['titulo']}</b> ➝ <b>$nTitulo</b>";
        }

        if ($nVariantes !== $viejo['variantes']) {
            $vOld = $viejo['variantes'] ?: 'N/A';
            $vNew = $nVariantes ?: 'N/A';
            $cambios[] = "Variante: <b>$vOld</b> ➝ <b>$vNew</b>";
        }

        if ($nDesc !== $viejo['descripcion']) {
            $cambios[] = "📝 Descripción Modificada";
        }


        if ($nStock != $viejo['stock']) {
            $tipoMov = $nStock > $viejo['stock'] ? 'entrada' : 'salida'; 
            $cambios[] = "Stock: <b>{$viejo['stock']}</b> ➝ <b>$nStock</b>";
        }

        if ($nPrecio != $viejo['precio_venta']) {
            $tipoMov = 'precio'; // Color naranja
            $cambios[] = "Precio: $<b>{$viejo['precio_venta']}</b> ➝ $<b>$nPrecio</b>";
        }

        if (!empty($cambios)) {
            $detalleFinal = implode('<br>', $cambios); 
            
            $sqlMov = "INSERT INTO movimientos (sku, titulo, tipo, detalle, usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())";
            $pdo->prepare($sqlMov)->execute([$sku, $nTitulo, $tipoMov, $detalleFinal, $user]);

            $sqlUpd = "UPDATE productos SET titulo=?, precio_venta=?, stock=?, variantes=?, descripcion=?, categoria=? WHERE sku=?";
            $pdo->prepare($sqlUpd)->execute([$nTitulo, $nPrecio, $nStock, $nVariantes, $nDesc, $nCat, $sku]);
            
            echo json_encode(['mensaje'=>'Cambios registrados en bitácora']);
        } else {
            echo json_encode(['mensaje'=>'No detecté cambios para guardar']);
        }

    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
?>