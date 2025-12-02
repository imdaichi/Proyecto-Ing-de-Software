<?php
// filepath: c:\Users\nicot\Desktop\Proyecto-Ing-de-Software\Backend\insertar_ventas_mensuales.php
// ============================================
// SCRIPT: Insertar ventas compatibles con dashboard.js
// ============================================

require_once __DIR__ . '/vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;

$projectId = 'cimehijodb';
$keyFile = __DIR__ . '/config/firebase-credentials.json';

if (!file_exists($keyFile)) {
    die("❌ Error: No se encuentra firebase-credentials.json\n");
}

try {
    $db = new FirestoreClient([
        'projectId' => $projectId,
        'keyFilePath' => $keyFile
    ]);
    
    echo "✅ Conectado a Firebase\n\n";

    // Configuración
    $anio = 2024;
    $email_usuario = 'admin@correo.com';
    
    // Productos de ejemplo (puedes agregar más)
    $productos = [
        [
            'sku' => 'CIMPIL065TR-GOL',
            'titulo' => 'Pijama Hombre Algodón Trevira Largo',
            'Titulo' => 'Pijama Hombre Algodón Trevira Largo', // Campo alternativo
            'precio_unitario' => 24990
        ],
        [
            'sku' => 'PROD-EJEMPLO-002',
            'titulo' => 'Camisa Deportiva Manga Larga',
            'Titulo' => 'Camisa Deportiva Manga Larga',
            'precio_unitario' => 18990
        ]
    ];

    // Insertar 1 venta por cada mes
    for ($mes = 1; $mes <= 12; $mes++) {
        // Fecha: día 17 de cada mes a las 13:25:31
        $fecha = mktime(13, 25, 31, $mes, 17, $anio);
        $timestamp = intval($fecha);
        
        // ✅ Formato ISO 8601 completo (lo que espera new Date() en JS)
        $fecha_iso = date('c', $fecha); // "2024-01-17T13:25:31-03:00"
        $fecha_legible = date('Y-m-d H:i:s', $fecha);

        // ✅ ID basado en fecha (sin "/" ni ":")
        $idVenta = 'VENTA-' . date('YmdHis', $fecha);

        // Seleccionar productos aleatorios (1-2 productos por venta)
        $numProductos = rand(1, 2);
        $items = [];
        $total = 0;

        for ($i = 0; $i < $numProductos; $i++) {
            $producto = $productos[array_rand($productos)];
            $cantidad = rand(1, 3); // 1-3 unidades
            $subtotal = $cantidad * $producto['precio_unitario'];
            $total += $subtotal;

            // ✅ Estructura compatible con dashboard.js
            $items[$i] = [
                'sku' => $producto['sku'],
                'titulo' => $producto['titulo'],      // Minúscula
                'Titulo' => $producto['Titulo'],      // Mayúscula (backup)
                'cantidad' => $cantidad,
                'precio_unitario' => $producto['precio_unitario'],
                'subtotal' => $subtotal
            ];
        }

        // ✅ Métodos de pago variados
        $metodos_pago = ['efectivo', 'tarjeta', 'transferencia', 'debito'];
        $metodo_pago = $metodos_pago[array_rand($metodos_pago)];

        // ✅ Insertar en Firestore con todos los campos necesarios
        $db->collection('ventas')->document($idVenta)->set([
            'id_venta' => $idVenta,              // ✅ Campo necesario
            'email_usuario' => $email_usuario,
            'estado' => 'completada',
            'fecha' => $fecha_iso,               // ✅ Formato ISO completo
            'fecha_legible' => $fecha_legible,
            'items' => $items,                   // ✅ Array con índices numéricos
            'metodo_pago' => $metodo_pago,       // ✅ Variable
            'timestamp' => $timestamp,
            'total' => floatval($total)
        ]);

        echo "✅ Venta insertada: $idVenta\n";
        echo "   📅 Fecha: $fecha_legible\n";
        echo "   💰 Total: \$" . number_format($total, 0, ',', '.') . "\n";
        echo "   🛒 Productos: $numProductos items\n";
        echo "   💳 Pago: $metodo_pago\n\n";

        // Registrar movimientos de salida
        foreach ($items as $item) {
            $db->collection('movimientos')->add([
                'sku' => $item['sku'],
                'titulo' => $item['titulo'],
                'tipo' => 'salida',
                'detalle' => "Venta de {$item['cantidad']} unidad(es) - Subtotal: \${$item['subtotal']}",
                'usuario' => $email_usuario,
                'fecha' => $fecha_legible,
                'timestamp' => $timestamp,
                'id_venta' => $idVenta
            ]);
        }
    }

    echo "\n🎉 Proceso completado: 12 ventas insertadas (1 por mes del año $anio)\n";
    echo "📊 Totales variables, métodos de pago aleatorios\n";
    echo "🔍 Verifica en Firebase Console → Colección 'ventas'\n";

} catch (Exception $e) {
    die("❌ Error: " . $e->getMessage() . "\n");
}
?>