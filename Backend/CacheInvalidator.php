<?php
/**
 * CacheInvalidator.php - Invalidación automática de caché
 * Se ejecuta cuando hay cambios en la BD
 */

require_once __DIR__ . '/Cache.php';

class CacheInvalidator {
    private $cache;
    
    public function __construct($cache) {
        $this->cache = $cache;
    }
    
    /**
     * Invalidar caché cuando se edita un producto
     */
    public function invalidarProducto($sku = null) {
        // Invalidar todos los cachés afectados por cambios en productos
        $this->cache->delete('dashboard_kpis');
        $this->cache->delete('notificaciones_productos');
        $this->cache->delete('ranking_metodos_pago');
        $this->cache->delete('reportes_general');
        
        if ($sku) {
            $this->cache->delete("producto_$sku");
        }
    }
    
    /**
     * Invalidar caché cuando hay nueva venta
     */
    public function invalidarVenta() {
        $this->cache->delete('dashboard_kpis');
        $this->cache->delete('ranking_metodos_pago');
        $this->cache->delete('reportes_general');
        $this->cache->delete('notificaciones_productos');
    }
    
    /**
     * Invalidar caché cuando hay cambio de precio
     */
    public function invalidarPrecio($sku = null) {
        $this->cache->delete('dashboard_kpis');
        $this->cache->delete('notificaciones_productos');
        
        if ($sku) {
            $this->cache->delete("producto_$sku");
        }
    }
    
    /**
     * Invalidar caché cuando hay cambio de stock
     */
    public function invalidarStock($sku = null) {
        $this->cache->delete('dashboard_kpis');
        $this->cache->delete('notificaciones_productos');
        
        if ($sku) {
            $this->cache->delete("producto_$sku");
        }
    }
    
    /**
     * Invalidar caché de proveedores
     */
    public function invalidarProveedores() {
        $this->cache->delete('proveedores_list');
        $this->cache->delete('proveedores_stats');
    }
    
    /**
     * Invalidar caché de usuarios
     */
    public function invalidarUsuarios() {
        $this->cache->delete('usuarios_list');
    }
    
    /**
     * Invalidar todo el caché (nuclear option)
     */
    public function invalidarTodo() {
        $this->cache->clear();
    }
}

// Crear instancia global
$cacheInvalidator = new CacheInvalidator($cache);
?>
