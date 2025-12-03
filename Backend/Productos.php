<?php
require_once __DIR__ . '/Config/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Kreait\Firebase\Factory;

if (!isset($pdo) && isset($db)) { $pdo = $db; }

$firebase = null;
$firestore = null;

try {
    $credentialsPath = __DIR__ . '/firebase-credentials.json';
    if (file_exists($credentialsPath)) {
        $firebase = (new Factory)->withServiceAccount($credentialsPath);
        $firestore = $firebase->createFirestore()->database();
    }
} catch (Exception $e) {
    error_log("Firebase init error: " . $e->getMessage());
    $firestore = null;
}

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
        $nEstado    = $datos['estado'] ?? $viejo['estado'];
        
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

        if ($nEstado !== $viejo['estado']) {
            $eOld = ucfirst($viejo['estado']);
            $eNew = ucfirst($nEstado);
            $cambios[] = "Estado: <b>$eOld</b> ➝ <b>$eNew</b>";
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

            $sqlUpd = "UPDATE productos SET titulo=?, precio_venta=?, stock=?, variantes=?, descripcion=?, categoria=?, estado=? WHERE sku=?";
            $pdo->prepare($sqlUpd)->execute([$nTitulo, $nPrecio, $nStock, $nVariantes, $nDesc, $nCat, $nEstado, $sku]);
            
            // Sincronizar con Firebase
            if ($firestore) {
                try {
                    $docRef = $firestore->collection('productos')->document($sku);
                    $snapshot = $docRef->snapshot();
                    if ($snapshot->exists()) {
                        $updateData = [];
                        if ($nTitulo !== $viejo['titulo']) $updateData[] = ['path' => 'Titulo', 'value' => $nTitulo];
                        if ($nStock != $viejo['stock']) $updateData[] = ['path' => 'Stock', 'value' => $nStock];
                        if ($nPrecio != $viejo['precio_venta']) $updateData[] = ['path' => 'Precio Venta', 'value' => (string)$nPrecio];
                        if ($nEstado !== $viejo['estado']) $updateData[] = ['path' => 'Estado', 'value' => ucfirst($nEstado)];
                        if ($nVariantes !== $viejo['variantes']) $updateData[] = ['path' => 'Variantes', 'value' => $nVariantes ?: ''];
                        if ($nDesc !== $viejo['descripcion']) $updateData[] = ['path' => 'Descripcion', 'value' => $nDesc ?: ''];
                        if ($nCat !== $viejo['categoria']) $updateData[] = ['path' => 'Categoria', 'value' => $nCat ?: ''];
                        
                        if (!empty($updateData)) {
                            $docRef->update($updateData);
                        }
                    }
                } catch (Exception $fbError) {
                    error_log("Firebase update error for SKU $sku: " . $fbError->getMessage());
                }
            }
            
            echo json_encode(['mensaje'=>'Cambios registrados en bitácora']);
        } else {
            echo json_encode(['mensaje'=>'No detecté cambios para guardar']);
        }

    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
?>