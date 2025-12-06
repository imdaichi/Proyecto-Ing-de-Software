# Firebase Sync - Documentación Implementada

## Descripción General
Se ha implementado un sistema completo de sincronización Firebase que permite:
- Detectar cambios en productos desde Firebase (últimos 2 días)
- Actualizar la base de datos MySQL con los datos de Firebase
- Mostrar un modal con resultados paginados (7 items por página)
- Visualizar cambios detallados de cada producto (campo → anterior → nuevo)

## Componentes Implementados

### 1. Backend - `Backend/SincronizarFirebase.php`
**Características:**
- Lee todos los productos de MySQL en memoria
- Consulta Firebase por documentos modificados en los últimos 2 días
- Compara cada campo (título, precio_venta, stock, variantes, descripción, categoría, estado)
- Genera lista detallada de cambios con valores anteriores y nuevos
- Ejecuta actualización atómica en transacción (seguridad de datos)
- Actualiza timestamp en tabla `config` para próximas sincronizaciones

**Respuesta esperada:**
```json
{
  "exito": true,
  "actualizados": 6,
  "creados": 2,
  "total_cambios": 8,
  "cambios": [
    {
      "sku": "CIMPIL065TR-GOL__24166945",
      "tipo": "actualizado",
      "cambios": {
        "stock": {
          "anterior": 11,
          "nuevo": 21
        }
      }
    },
    ...
  ]
}
```

### 2. Backend - `Backend/SincronizarFirebaseMock.php`
**Propósito:** Versión simulada para testing sin Firebase real
**Cambios simulados:** 8 productos (6 actualizados, 2 nuevos)
**Uso:** Actualmente enrutado como fallback para demostración

### 3. Frontend - `Frontend/Dashboard/index.html`
**Nuevos elementos HTML:**

#### Botón en bitácora:
```html
<button id="btn-actualizar-base" class="btn-accion">↻ Actualizar Base</button>
```

#### Modal de resultados:
- ID: `modal-sync-resultados`
- Componentes:
  - Header con cierre (X)
  - Resumen: contador de actualizados, nuevos, total cambios
  - Lista de cambios scrolleable (7 items por página)
  - Paginación (anterior/siguiente)
  - Footer con botón cerrar

**Estilos:**
- Modal overlay (fondo oscuro, centrado)
- Tarjetas de cambio con información detallada
- Tabla de cambios por campo
- Indicadores visuales (🆕 para nuevos, ✏️ para actualizados)

### 4. Frontend - `Frontend/Dashboard/dashboard.js`
**Nueva clase: `SincronizacionFirebase`**

**Métodos principales:**
- `iniciarSincronizacion()`: POST a `/sincronizar-firebase`, maneja respuesta
- `mostrarModal()` / `cerrarModal()`: Control del modal
- `renderizarPagina()`: Renderiza cambios de la página actual
- `normalizarCampo()`: Traduce nombres de campos a español
- `truncarTexto()`: Acorta textos largos
- `paginaAnterior()` / `paginaSiguiente()`: Navegación

**Funcionalidades:**
- Gestiona paginación de 7 items por página
- Calcula totales de actualizados/nuevos
- Renderiza tabla de cambios por producto
- Habilita/deshabilita botones según página
- Integración con sistema de toasts (`mostrarExito`, `mostrarToast`)

### 5. Base de datos - tabla `config`
**Nuevo registro:**
- `clave`: `ultima_sincronizacion_firebase`
- `valor`: timestamp de última sincronización
- `fecha_actualizacion`: timestamp de actualización

## Flujo de Uso

### 1. Usuario navega a Dashboard
```
Frontend/Dashboard/index.html carga
↓
dashboard.js inicializa SincronizacionFirebase
↓
SincronizacionFirebase.cargarEventListeners() wireado
```

### 2. Usuario hace clic en "↻ Actualizar Base"
```
BTN click → iniciarSincronizacion()
↓
POST /sincronizar-firebase
↓
Backend lee MySQL + Firebase (filtrado 2 días)
↓
Detecta cambios y responde
↓
Frontend renderiza modal paginado
↓
Toast de éxito: "X cambios procesados"
```

### 3. Modal de resultados
```
Encabezado: "6 productos actualizados | 2 nuevos | 8 cambios totales"
↓
Lista paginada (7 items/página):
├─ Producto 1 (actualizado)
│  ├─ Título
│  ├─ Anterior: ...
│  └─ Nuevo: ...
├─ Producto 2 (nuevo)
├─ ...
└─ [Siguiente →]
```

### 4. Navegación en modal
```
[← Anterior] [Página 1 de 2] [Siguiente →]
```

## Configuración

### Variables globales en `dashboard.js`
```javascript
const API_URL = 'http://localhost:8000';
const itemsPorPagina = 7;  // Páginas con 7 items
```

### Rutas en `Backend/index.php`
```php
case 'sincronizar-firebase': require __DIR__ . '/SincronizarFirebaseMock.php'; break;
```
⚠️ Cambiar a `SincronizarFirebase.php` cuando Firebase esté configurado.

## Cambio entre Mock y Real

### Para usar Firebase real:
```php
// En Backend/index.php, línea ~43
case 'sincronizar-firebase': require __DIR__ . '/SincronizarFirebase.php'; break;
```

### Para probar con datos simulados:
```php
// En Backend/index.php, línea ~43
case 'sincronizar-firebase': require __DIR__ . '/SincronizarFirebaseMock.php'; break;
```

## Optimización Firebase

**Ventana de sincronización:** 2 días
- Minimiza lecturas de Firestore
- Con 6000 productos: ~6000 doc reads en peor caso
- Plan free tier: 50,000 reads/día = múltiples sincronizaciones posibles

**Consulta Firebase:**
```
WHERE lastModified >= DATE_SUB(NOW(), INTERVAL 2 DAY)
```

## Testing

### Endpoint directo:
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8000/sincronizar-firebase" `
  -Method POST -ContentType "application/json" -Body "{}"
$response.Content | ConvertFrom-Json
```

### Esperado:
- 8 cambios (mock): 6 actualizados + 2 nuevos
- JSON con array de cambios
- Cada cambio con sku, tipo, cambios (por campo)

## Archivos Modificados

1. ✅ `Backend/index.php` - Ruta agregada
2. ✅ `Backend/SincronizarFirebase.php` - Creado (versión real)
3. ✅ `Backend/SincronizarFirebaseMock.php` - Creado (versión mock)
4. ✅ `Frontend/Dashboard/index.html` - Botón + Modal agregados
5. ✅ `Frontend/Dashboard/dashboard.js` - Clase SincronizacionFirebase agregada

## Notas de Implementación

- **Transacciones:** SincronizarFirebase.php usa transacciones para atomicidad
- **Paginación:** Frontend-side (sin API calls adicionales)
- **UX:** Modal con overlay, auto-cierra con X o botones
- **Accesibilidad:** Tecla Escape cierra modal
- **Escalabilidad:** Estructurado para manejar 6000+ productos

## Próximos Pasos (Opcional)

1. Agregar filtros en modal (por tipo: nuevo/actualizado)
2. Exportar cambios a CSV
3. Historial de sincronizaciones
4. Notificaciones en tiempo real
5. Validación de datos antes de actualizar

## Rollback a Versión Real

Cuando Firebase esté completamente configurado:
1. Cambiar ruta en `index.php` a `SincronizarFirebase.php`
2. Eliminar o deshabilitar `SincronizarFirebaseMock.php`
3. Probar con datos reales de Firebase
