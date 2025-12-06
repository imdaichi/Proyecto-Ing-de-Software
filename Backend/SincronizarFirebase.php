<?php
require_once __DIR__ . '/Config/db.php';
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/CacheInvalidator.php';

if (!isset($pdo) && isset($db)) { $pdo = $db; }

header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(['error' => 'No hay conexión a BD']);
    exit;
}

if ($metodo === 'POST') {
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
                error_log("Firebase init error: " . $e->getMessage());
                $firestore = null;
            }
        }
        
        if (!$firestore) {
            http_response_code(500);
            echo json_encode(['error' => 'Firebase no disponible']);
            exit;
        }
        
        // Obtener última sincronización desde config
        $sqlConfig = "SELECT valor FROM config WHERE clave = 'ultima_sincronizacion_firebase'";
        $stmtConfig = $pdo->query($sqlConfig);
        $configRow = $stmtConfig->fetch(PDO::FETCH_ASSOC);
        $ultimaSinc = $configRow ? strtotime($configRow['valor']) : strtotime('-2 days');
        
        // Obtener todos los productos de MySQL
        $sqlProductos = "SELECT sku, titulo, precio_venta, stock, variantes, descripcion, categoria, estado FROM productos";
        $stmtProductos = $pdo->query($sqlProductos);
        $productosMySQL = [];
        while ($row = $stmtProductos->fetch(PDO::FETCH_ASSOC)) {
            $productosMySQL[$row['sku']] = $row;
        }
        
        // Obtener productos de Firebase con cambios desde última sincronización
        $productosFirebase = [];
        $cambios = [];
        
        try {
            $coleccion = $firestore->collection('productos');
            $documentos = $coleccion->documents();
            
            foreach ($documentos as $doc) {
                if (!$doc->exists()) continue;
                
                $sku = $doc->id();
                $data = $doc->data();
                
                // Convertir timestamp de Firebase a datetime
                $lastModified = isset($data['lastModified']) ? $data['lastModified']->toDateTime()->format('Y-m-d H:i:s') : null;
                
                // CRÍTICO: Solo incluir productos modificados DESPUÉS de última sincronización
                // Si no tiene lastModified, lo saltamos (datos viejos sin timestamp)
                if (!$lastModified || strtotime($lastModified) <= $ultimaSinc) {
                    continue;
                }
                
                $productosFirebase[$sku] = [
                    'titulo' => $data['Titulo'] ?? null,
                    'precio_venta' => isset($data['Precio Venta']) ? (int)$data['Precio Venta'] : null,
                    'stock' => isset($data['Stock']) ? (int)$data['Stock'] : null,
                    'variantes' => $data['Variantes'] ?? null,
                    'descripcion' => $data['Descripcion'] ?? null,
                    'categoria' => $data['Categoria'] ?? null,
                    'estado' => strtolower($data['Estado'] ?? 'activo'),
                    'lastModified' => $lastModified
                ];
            }
        } catch (Exception $fbError) {
            error_log("Firebase fetch error: " . $fbError->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Error al leer Firebase: ' . $fbError->getMessage()]);
            exit;
        }
        
        // Comparar y detectar cambios
        $cambiosDetectados = [];
        
        foreach ($productosFirebase as $sku => $datosFirebase) {
            $datosMySQL = $productosMySQL[$sku] ?? null;
            
            if (!$datosMySQL) {
                // Producto nuevo en Firebase
                $cambiosDetectados[] = [
                    'sku' => $sku,
                    'tipo' => 'nuevo',
                    'cambios' => [],
                    'firebase' => $datosFirebase
                ];
            } else {
                // Comparar campos
                $cambiosCampos = [];
                
                $campos = ['titulo', 'precio_venta', 'stock', 'variantes', 'descripcion', 'categoria', 'estado'];
                foreach ($campos as $campo) {
                    $valMySQL = $datosMySQL[$campo];
                    $valFirebase = $datosFirebase[$campo];
                    
                    // Normalizar tipos
                    if (is_numeric($valMySQL)) $valMySQL = (int)$valMySQL;
                    if (is_numeric($valFirebase)) $valFirebase = (int)$valFirebase;
                    
                    if ((string)$valMySQL !== (string)$valFirebase) {
                        $cambiosCampos[$campo] = [
                            'anterior' => $valMySQL,
                            'nuevo' => $valFirebase
                        ];
                    }
                }
                
                if (!empty($cambiosCampos)) {
                    $cambiosDetectados[] = [
                        'sku' => $sku,
                        'tipo' => 'actualizado',
                        'cambios' => $cambiosCampos,
                        'firebase' => $datosFirebase
                    ];
                }
            }
        }
        
        // Si hay cambios, actualizar MySQL
        $actualizados = 0;
        $creados = 0;
        
        if (!empty($cambiosDetectados)) {
            $pdo->beginTransaction();
            
            try {
                foreach ($cambiosDetectados as $cambio) {
                    $sku = $cambio['sku'];
                    $fb = $cambio['firebase'];
                    
                    if ($cambio['tipo'] === 'nuevo') {
                        $sqlInsert = "INSERT INTO productos (sku, titulo, precio_venta, stock, variantes, descripcion, categoria, estado) 
                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmtInsert = $pdo->prepare($sqlInsert);
                        $stmtInsert->execute([
                            $sku,
                            $fb['titulo'],
                            $fb['precio_venta'] ?? 0,
                            $fb['stock'] ?? 0,
                            $fb['variantes'],
                            $fb['descripcion'],
                            $fb['categoria'],
                            $fb['estado'] ?? 'activo'
                        ]);
                        $creados++;
                        
                        // Invalidar caché del producto nuevo
                        $cacheInvalidator->invalidarProducto($sku);
                    } else {
                        $sqlUpdate = "UPDATE productos SET titulo=?, precio_venta=?, stock=?, variantes=?, descripcion=?, categoria=?, estado=? WHERE sku=?";
                        $stmtUpdate = $pdo->prepare($sqlUpdate);
                        $stmtUpdate->execute([
                            $fb['titulo'],
                            $fb['precio_venta'] ?? 0,
                            $fb['stock'] ?? 0,
                            $fb['variantes'],
                            $fb['descripcion'],
                            $fb['categoria'],
                            $fb['estado'] ?? 'activo',
                            $sku
                        ]);
                        $actualizados++;
                        
                        // Invalidar caché del producto editado
                        $cacheInvalidator->invalidarProducto($sku);
                    }
                }
                
                // Actualizar timestamp de sincronización
                $sqlUpdateConfig = "UPDATE config SET valor = NOW() WHERE clave = 'ultima_sincronizacion_firebase'";
                $pdo->query($sqlUpdateConfig);
                
                // Si hay cambios, invalidar caché global de dashboard y notificaciones
                if (count($cambiosDetectados) > 0) {
                    $cache->delete('dashboard_kpis');
                    $cache->delete('notificaciones_productos');
                    $cache->delete('ranking_metodos_pago');
                    // Los productos individuales ya fueron invalidados en el loop anterior
                }
                
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
        
        // Mensaje apropiado según cambios
        $mensaje = count($cambiosDetectados) > 0 
            ? "Sincronización completada con éxito" 
            : "Base de datos ya está actualizada. No hay cambios nuevos desde la última sincronización.";
        
        echo json_encode([
            'exito' => true,
            'actualizados' => $actualizados,
            'creados' => $creados,
            'total_cambios' => count($cambiosDetectados),
            'cambios' => $cambiosDetectados,
            'mensaje' => $mensaje
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error: ' . $e->getMessage()]);
    }
}
?>
