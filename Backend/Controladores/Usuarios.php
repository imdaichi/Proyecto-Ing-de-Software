<?php
// Controladores/usuarios.php

// Usamos las variables globales definidas en index.php
global $db, $metodo, $datos; 

header('Content-Type: application/json');

if ($metodo == 'GET') {
    try {
        $usuariosRef = $db->collection('usuarios');
        $documentos = $usuariosRef->documents();
        $respuesta = [];
        foreach ($documentos as $doc) {
            $usuario = $doc->data();
            $usuario['id'] = $doc->id();
            $respuesta[] = $usuario;
        }
        echo json_encode($respuesta);
    } catch (Exception $e) { /*...manejo de error... */ }
}

if ($metodo == 'POST') {
    // (Tu lógica para crear un usuario POST iría aquí)
    echo json_encode(['mensaje' => 'Usuario creado (lógica pendiente)']);
}
?>