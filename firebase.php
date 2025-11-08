<?php
// firebase.php (Versión para CLOUD FIRESTORE)

require __DIR__.'/vendor/autoload.php';

use Kreait\Firebase\Factory;

// Asegúrate de que el nombre del archivo .json sea el correcto
$serviceAccount = __DIR__.'/firebase-credentials.json';

$factory = (new Factory)
    ->withServiceAccount($serviceAccount);

// Ya no necesitamos la URI de la Realtime Database
$firestore = $factory->createFirestore();

// Esta es la variable global que usarán tus otros archivos
$db = $firestore->database(); 

?>