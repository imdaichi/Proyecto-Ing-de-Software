<?php
/**
 * firebase-sync-worker.php
 * 
 * Worker para sincronizar con Firebase en background
 * Se ejecuta de forma asíncrona sin bloquear requests HTTP
 */

// Obtener archivo de cola
$queueFile = $argv[1] ?? null;
if (!$queueFile || !file_exists($queueFile)) exit;

try {
    // Cargar configuración
    require_once __DIR__ . '/Config/db.php';
    
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
            error_log("Firebase init error in worker: " . $e->getMessage());
        }
    }

    if (!$firestore) {
        unlink($queueFile);
        exit;
    }

    // Leer cola de actualizaciones
    $queue = json_decode(file_get_contents($queueFile), true);

    // Procesar cada actualización
    foreach ($queue as $update) {
        try {
            $sku = $update['sku'];
            $updateData = $update['data'];

            $docRef = $firestore->collection('productos')->document($sku);
            $snapshot = $docRef->snapshot();

            if ($snapshot->exists() && !empty($updateData)) {
                $docRef->update($updateData);
                error_log("Firebase sync success for SKU: $sku");
            }
        } catch (Exception $e) {
            error_log("Firebase sync error for SKU: " . ($update['sku'] ?? 'unknown') . " - " . $e->getMessage());
        }
    }

    // Limpiar archivo de cola
    @unlink($queueFile);

} catch (Exception $e) {
    error_log("Firebase worker fatal error: " . $e->getMessage());
}
?>
