<?php
/**
 * SincronizarFirebaseMock.php - Versión de prueba para demostrar la funcionalidad
 * Este archivo simula cambios para testing sin necesidad de Firebase real
 */

header('Content-Type: application/json; charset=utf-8');

// Simulamos cambios de prueba
$cambiosSimulados = [
    [
        'sku' => 'CIMPIL065TR-GOL__24166945',
        'tipo' => 'actualizado',
        'cambios' => [
            'stock' => [
                'anterior' => 11,
                'nuevo' => 21
            ]
        ]
    ],
    [
        'sku' => 'CIMCDON07',
        'tipo' => 'actualizado',
        'cambios' => [
            'precio_venta' => [
                'anterior' => 15000,
                'nuevo' => 17500
            ],
            'titulo' => [
                'anterior' => 'Juego De Habilidad Jenga Version Mini',
                'nuevo' => 'Juego De Habilidad Jenga Premium Edition'
            ]
        ]
    ],
    [
        'sku' => 'GEN-POL-001',
        'tipo' => 'actualizado',
        'cambios' => [
            'stock' => [
                'anterior' => 50,
                'nuevo' => 100
            ],
            'categoria' => [
                'anterior' => 'Ropa',
                'nuevo' => 'Ropa - Outlet'
            ]
        ]
    ],
    [
        'sku' => 'TEST-NUEVO-001',
        'tipo' => 'nuevo',
        'cambios' => []
    ],
    [
        'sku' => 'GEN-TAZ-002',
        'tipo' => 'actualizado',
        'cambios' => [
            'descripcion' => [
                'anterior' => 'Tazón personalizado con diseño basic',
                'nuevo' => 'Tazón personalizado con diseño premium y acabado mate'
            ]
        ]
    ],
    [
        'sku' => 'CIMPIL730FR-SC',
        'tipo' => 'actualizado',
        'cambios' => [
            'stock' => [
                'anterior' => 1,
                'nuevo' => 25
            ],
            'estado' => [
                'anterior' => 'activo',
                'nuevo' => 'activo'
            ]
        ]
    ],
    [
        'sku' => 'TEST-VARIANTE-001',
        'tipo' => 'actualizado',
        'cambios' => [
            'variantes' => [
                'anterior' => 'Talla: S, Color: Rojo',
                'nuevo' => 'Talla: S/M/L, Color: Rojo/Azul/Negro'
            ]
        ]
    ],
    [
        'sku' => 'TEST-NUEVO-002',
        'tipo' => 'nuevo',
        'cambios' => []
    ]
];

// Devolver respuesta simulada
$actualizados = count(array_filter($cambiosSimulados, function($c) { return $c['tipo'] === 'actualizado'; }));
$creados = count(array_filter($cambiosSimulados, function($c) { return $c['tipo'] === 'nuevo'; }));

echo json_encode([
    'exito' => true,
    'actualizados' => $actualizados,
    'creados' => $creados,
    'total_cambios' => count($cambiosSimulados),
    'cambios' => $cambiosSimulados
], JSON_UNESCAPED_UNICODE);
?>
