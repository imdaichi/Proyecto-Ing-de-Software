<?php

// Incluimos nuestra conexión a Firestore
require 'firebase.php';

header('Content-Type: application/json');

// $db viene de nuestro archivo 'firebase.php'
global $db; 

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$ruta_completa = $_SERVER['REQUEST_URI'] ?? '/';
$ruta = strtok($ruta_completa, '?');

$datos = json_decode(file_get_contents('php://input'), true);

switch ($ruta) {

    // --- ENDPOINT DE USUARIOS ---
    case '/api/usuarios':
        
        // --- GET /api/usuarios ---
        if ($metodo == 'GET') {
            try {
                $usuariosRef = $db->collection('usuarios');
                $documentos = $usuariosRef->documents();
                
                $respuesta = [];
                foreach ($documentos as $doc) {
                    // Añadimos el ID del documento junto con sus datos
                    $usuario = $doc->data();
                    $usuario['id'] = $doc->id();
                    $respuesta[] = $usuario;
                }
                
                echo json_encode($respuesta);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Error al leer de Firestore: ' . $e->getMessage()]);
            }
        }
        
        // --- POST /api/usuarios ---
        if ($metodo == 'POST') {
            try {
                if (!isset($datos['nombre']) || !isset($datos['email'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Los campos nombre y email son obligatorios']);
                    break; 
                }

                $nuevoUsuario = [
                    'nombre' => $datos['nombre'],
                    'email' => $datos['email'],
                    'fecha_registro' => date('Y-m-d H:i:s')
                ];

                // Añadir un nuevo documento (Firestore genera el ID)
                $docRef = $db->collection('usuarios')->add($nuevoUsuario);

                http_response_code(201);
                echo json_encode([
                    'mensaje' => 'Usuario creado con éxito en Firestore',
                    'id_generado' => $docRef->id()
                ]);

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Error al escribir en Firestore: ' . $e->getMessage()]);
            }
        }
        break;

    // --- ENDPOINT DE PRODUCTOS (MEJORADO) ---
    case '/api/productos':
        if ($metodo == 'GET') {
            try {
                // $db viene de 'firebase.php'
                global $db;                
                // 1. Revisamos si nos pasaron un SKU en la URL
                // (ej: /api/productos?sku=SKU-A-BUSCAR)
                if (isset($_GET['sku'])) {
                    
                    $sku_buscado = $_GET['sku'];
                    
                    // 2. ¡Importante! Limpiamos el SKU que nos pasa el usuario
                    //    (igual que en la importación) por si nos pasa "SKU/CON/BARRA"
                    $sku_limpio = str_replace('/', '-', $sku_buscado);
                    $sku_limpio = str_replace('\\', '-', $sku_limpio); 

                    // 3. Apuntamos al documento exacto en Firestore
                    $docRef = $db->collection('productos')->document($sku_limpio);
                    $snapshot = $docRef->snapshot();

                    // 4. Verificamos si existe
                    if ($snapshot->exists()) {
                        // ¡Encontrado! Devolvemos solo ese producto
                        $producto = $snapshot->data();
                        $producto['id_sku_en_db'] = $snapshot->id(); // Añadimos el ID
                        echo json_encode($producto);
                    } else {
                        // No encontrado
                        http_response_code(404); // Not Found
                        echo json_encode(['error' => 'Producto no encontrado con el SKU: ' . $sku_buscado]);
                    }
                    
                } else {
                    // --- SI NO PIDEN SKU, DEVOLVEMOS TODO (COMO ANTES) ---
                    $productosRef = $db->collection('productos');
                    $documentos = $productosRef->documents();
                    
                    $respuesta = [];
                    foreach ($documentos as $doc) {
                        $producto = $doc->data();
                        $producto['id_sku_en_db'] = $doc->id(); // El ID es el SKU limpio
                        $respuesta[] = $producto;
                    }
                    
                    echo json_encode($respuesta);
                }

            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Error al leer productos de Firestore: ' . $e->getMessage()]);
            }
        }
        break;

    default:
        echo json_encode(['mensaje' => 'Bienvenido a mi API con PHP y Cloud Firestore']);
        break;
}
?>