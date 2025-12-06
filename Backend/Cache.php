<?php
/**
 * Cache.php - Sistema de caché con archivos
 * Almacena datos temporales para mejorar performance
 */

class Cache {
    private $cacheDir = '/tmp/cimehijo_cache';
    private $defaultTTL = 300; // 5 minutos por defecto
    
    public function __construct() {
        // Crear directorio de caché si no existe
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0755, true);
        }
    }
    
    /**
     * Obtener valor del caché
     * @param string $key Clave del caché
     * @return mixed|null El valor si existe y no expiró, null si no existe
     */
    public function get($key) {
        $filePath = $this->getFilePath($key);
        
        if (!file_exists($filePath)) {
            return null;
        }
        
        $data = json_decode(file_get_contents($filePath), true);
        
        // Verificar si expiró
        if (isset($data['expires']) && time() > $data['expires']) {
            unlink($filePath);
            return null;
        }
        
        return $data['value'] ?? null;
    }
    
    /**
     * Guardar valor en caché
     * @param string $key Clave del caché
     * @param mixed $value Valor a guardar
     * @param int $ttl Tiempo de vida en segundos (default 300)
     */
    public function set($key, $value, $ttl = null) {
        if ($ttl === null) {
            $ttl = $this->defaultTTL;
        }
        
        $filePath = $this->getFilePath($key);
        
        $data = [
            'value' => $value,
            'expires' => time() + $ttl,
            'created' => date('Y-m-d H:i:s')
        ];
        
        file_put_contents($filePath, json_encode($data));
    }
    
    /**
     * Eliminar caché específico
     * @param string $key Clave del caché
     */
    public function delete($key) {
        $filePath = $this->getFilePath($key);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    /**
     * Limpiar todo el caché
     */
    public function clear() {
        $files = glob($this->cacheDir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
    
    /**
     * Obtener la ruta del archivo de caché
     * @param string $key Clave del caché
     * @return string Ruta del archivo
     */
    private function getFilePath($key) {
        // Sanitizar la clave para evitar path traversal
        $key = preg_replace('/[^a-z0-9_-]/i', '_', $key);
        return $this->cacheDir . '/' . $key . '.cache';
    }
    
    /**
     * Recordar (obtener o calcular y guardar)
     * Útil para callbacks
     * @param string $key Clave del caché
     * @param callable $callback Función a ejecutar si no está en caché
     * @param int $ttl Tiempo de vida
     * @return mixed
     */
    public function remember($key, callable $callback, $ttl = null) {
        $cached = $this->get($key);
        
        if ($cached !== null) {
            return $cached;
        }
        
        $value = call_user_func($callback);
        $this->set($key, $value, $ttl);
        
        return $value;
    }
}

// Instancia global de caché
$cache = new Cache();
?>
