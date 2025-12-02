<?php
// Backend/reset_db.php
require_once __DIR__ . '/Config/db.php';

if (!isset($pdo)) die("Error de conexión");

echo "<h1>🛠️ REPARANDO BASE DE DATOS...</h1>";

try {
    // 1. LIMPIAR TABLAS (Orden específico para evitar errores de claves foráneas)
    $pdo->exec("DELETE FROM movimientos");
    $pdo->exec("DELETE FROM ventas");
    $pdo->exec("DELETE FROM productos");
    $pdo->exec("DELETE FROM usuarios");
    
    echo "✅ Tablas limpiadas.<br>";

    // 2. CREAR USUARIOS
    $pdo->exec("INSERT INTO usuarios (nombre, email, password, rol) VALUES 
        ('Admin', 'admin@test.com', '123456', 'admin'),
        ('Vendedor', 'vendedor@test.com', '123456', 'vendedor')");

    // 3. CREAR PRODUCTOS/
    $pdo->exec("INSERT INTO productos (sku, titulo, precio_venta, stock, estado) VALUES 
        ('COCA', 'Coca Cola 3L', 2500, 100, 'activo'),
        ('PAN', 'Pan Molde', 1800, 50, 'activo'),
        ('LECHE', 'Leche Entera', 1200, 200, 'activo')");
    
    echo "✅ Productos y Usuarios creados.<br>";

    // 4. CREAR VENTAS HISTÓRICAS (Para que el gráfico funcione)
    $stmt = $pdo->prepare("INSERT INTO ventas (fecha, total, metodo_pago, email_usuario, items) VALUES (?, ?, ?, ?, ?)");

    // Venta Enero
    $jsonEnero = json_encode([['titulo'=>'Coca Cola 3L', 'cantidad'=>2, 'precio_venta'=>2500]]);
    $stmt->execute(['2024-01-15 10:00:00', 5000, 'efectivo', 'admin@test.com', $jsonEnero]);

    // Venta Febrero
    $jsonFeb = json_encode([['titulo'=>'Pan Molde', 'cantidad'=>5, 'precio_venta'=>1800]]);
    $stmt->execute(['2024-02-20 15:00:00', 9000, 'tarjeta', 'vendedor@test.com', $jsonFeb]);

    // Venta Marzo (Actual o reciente)
    $jsonMar = json_encode([['titulo'=>'Leche Entera', 'cantidad'=>10, 'precio_venta'=>1200]]);
    $stmt->execute([date('Y-m-d H:i:s'), 12000, 'efectivo', 'admin@test.com', $jsonMar]);

    echo "✅ Ventas Históricas inyectadas (JSON Correcto).<br>";
    echo "<h2>🚀 LISTO. Ahora ve al Dashboard (Inicio).</h2>";

} catch (Exception $e) {
    die("❌ Error: " . $e->getMessage());
}
?>