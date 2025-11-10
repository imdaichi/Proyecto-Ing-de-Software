<?php
require __DIR__.'/../vendor/autoload.php';

use Kreait\Firebase\Factory;

$serviceAccount = __DIR__.'/../firebase-credentials.json'; 

$factory = (new Factory)
    ->withServiceAccount($serviceAccount);

$firestore = $factory->createFirestore();

// Esta es la variable global que usará index.php
$db = $firestore->database(); 
?>