<?php
require_once __DIR__ . '/Config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Cargar Firebase
    $firebase = null;
    $firestore = null;
    
    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        require_once __DIR__ . '/vendor/autoload.php';
        
        try {
            $credentialsPath = __DIR__ . '/firebase-credentials.json';
            if (file_exists($credentialsPath)) {
                $firebase = (new \Kreait\Firebase\Factory)->withServiceAccount($credentialsPath);
                $firestore = $firebase->createFirestore()->database();
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Firebase init: ' . $e->getMessage()]);
            exit;
        }
    }
    
    if (!$firestore) {
        http_response_code(500);
        echo json_encode(['error' => 'Firebase no disponible']);
        exit;
    }
    
    // Buscar el SKU específico
    $sku = $_GET['sku'] ?? '15990';
    
    $coleccion = $firestore->collection('productos');
    $doc = $coleccion->document($sku)->snapshot();
    
    if (!$doc->exists()) {
        echo json_encode([
            'existe' => false,
            'sku' => $sku,
            'mensaje' => 'Producto no encontrado en Firebase'
        ]);
        exit;
    }
    
    $data = $doc->data();
    
    // Procesar lastModified
    $lastModified = null;
    if (isset($data['lastModified'])) {
        try {
            $lastModified = $data['lastModified']->toDateTime()->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $lastModified = 'Error al parsear: ' . $e->getMessage();
        }
    }
    
    // Calcular si está dentro de 2 días
    $fechaLimite = date('Y-m-d H:i:s', strtotime('-2 days'));
    $estaEnLimite = $lastModified && strtotime($lastModified) >= strtotime($fechaLimite) ? true : false;
    
    echo json_encode([
        'existe' => true,
        'sku' => $sku,
        'datos' => [
            'titulo' => $data['Titulo'] ?? null,
            'precio_venta' => $data['precio_venta'] ?? null,
            'stock' => $data['stock'] ?? null,
            'estado' => $data['estado'] ?? null,
            'lastModified' => $lastModified,
            'fecha_limite' => $fechaLimite,
            'dentro_de_2_dias' => $estaEnLimite
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
