<?php
/**
 * SincronizarFirebaseAsync.php
 * 
 * Sincronización asíncrona con Firebase para evitar delays
 * Se ejecuta en background sin bloquear la respuesta HTTP
 */

class SincronizarFirebaseAsync {
    private $firestore;
    private $queue = [];

    public function __construct($firestore) {
        $this->firestore = $firestore;
    }

    /**
     * Agregar actualización a la cola (no ejecuta de inmediato)
     */
    public function agregarActualizacion($sku, $updateData) {
        if (!$this->firestore) return;
        
        $this->queue[] = [
            'sku' => $sku,
            'data' => $updateData,
            'timestamp' => microtime(true)
        ];
    }

    /**
     * Procesar la cola en background (sin bloquear)
     */
    public function procesarAsync() {
        if (empty($this->queue)) return;

        // Guardar cola en un archivo temporal
        $queueFile = sys_get_temp_dir() . '/firebase_queue_' . uniqid() . '.json';
        file_put_contents($queueFile, json_encode($this->queue));

        // Ejecutar script de sincronización en background (sin esperar)
        $scriptPath = __DIR__ . '/firebase-sync-worker.php';
        
        if (PHP_OS_FAMILY === 'Windows') {
            // Windows: usar popen con invisibilidad
            $command = "start /B php \"$scriptPath\" \"$queueFile\" > nul 2>&1";
            popen($command, 'r');
        } else {
            // Linux/Mac: usar nohup
            $command = "nohup php \"$scriptPath\" \"$queueFile\" > /dev/null 2>&1 &";
            exec($command);
        }

        $this->queue = [];
    }
}
?>
