# 🔗 Firebase + Caché - Guía de Integración

## ¿Qué cambió?

El botón **"Actualizar Base"** ahora está **CONECTADO A FIREBASE REAL** y sincroniza automáticamente con el sistema de caché.

### Antes (Mock):
```javascript
// ❌ Datos simulados (solo para testing)
GET /sincronizar-firebase → SincronizarFirebaseMock.php
Resultado: Cambios ficticios, sin conectar a BD real
```

### Ahora (Real):
```javascript
// ✅ Datos reales desde Firebase
GET /sincronizar-firebase → SincronizarFirebase.php
1. Conecta a Firebase Firestore
2. Lee productos con cambios en últimos 2 días
3. Compara con MySQL
4. Actualiza BD con datos de Firebase
5. Invalida caché automáticamente
```

---

## 🔄 Flujo Completo: Firebase → MySQL → Caché

```
┌─────────────────────────────────────────────────────────────────┐
│                     Usuario en Dashboard                        │
│              Hace click en "Actualizar Base"                    │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard.js - SincronizacionFirebase.iniciarSincronizacion()   │
│  POST /sincronizar-firebase                                      │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│        Backend - SincronizarFirebase.php                         │
│  1. Conectar a Firebase Firestore                               │
│  2. Leer productos con cambios en últimos 2 días                │
│  3. Comparar con MySQL                                          │
└──────────────┬──────────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ✅ CAMBIOS    ❌ SIN CAMBIOS
        │             │
        ▼             ▼
    UPDATE BD    RESPONDER 200
        │             │
        ▼             └─────────┐
┌──────────────────────┐        │
│ Invalidar caché      │        │
├──────────────────────┤        │
│ • dashboard_kpis     │        │
│ • notificaciones     │        │
│ • rankings           │        │
│ • producto_*         │        │
└──────────────────────┘        │
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ Responder al usuario │
         │ {cambios procesados} │
         └─────────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ Mostrar modal con   │
         │ lista de cambios    │
         │ en 7 items/página   │
         └─────────────────────┘
```

---

## 📋 Qué Detecta la Sincronización

### 1. Productos Nuevos
```
Firebase tiene: SKU-NUEVO-001
MySQL no tiene
→ Crear en MySQL
→ Invalidar caché de producto
```

### 2. Productos Actualizados
```
Firebase: Stock = 50
MySQL: Stock = 30
→ Actualizar MySQL a 50
→ Invalidar caché de producto

También detecta cambios en:
- Título
- Precio
- Variantes
- Descripción
- Categoría
- Estado
```

### 3. No Detecta Eliminados
```
MySQL tiene: SKU-VIEJO-001
Firebase no tiene
→ NO se elimina (manual)
```

---

## ⚡ Caché Integrado

Después de sincronizar, el sistema **invalida automáticamente**:

| Cache | Se invalida | Razón |
|-------|-------------|-------|
| `dashboard_kpis` | ✅ SÍ | Stock/monto de inventario cambió |
| `notificaciones_productos` | ✅ SÍ | Stock cambió (afecta alertas) |
| `ranking_metodos_pago` | ✅ SÍ | Stock/cantidad cambió |
| `producto_$sku` | ✅ SÍ | Cada producto individual |
| `proveedores_list` | ❌ NO | No relacionado |
| `usuarios_list` | ❌ NO | No relacionado |

### Resultado
```
Después de sincronizar:
1. Dashboard muestra datos actualizados (sin caché)
2. Próximo GET recrea caché con datos nuevos
3. Siguientes GETs = 42ms (desde caché)
4. Si editas algo, caché se invalida nuevamente
```

---

## 🎯 Cómo Usar

### Paso 1: Hacer cambios en Firebase
```
Firebase Firestore (admin panel):
┌─ Colección: productos
│  ├─ Documento: SKU-123
│  │  ├─ Stock: 50 → 75
│  │  ├─ Titulo: "Producto A"
│  │  └─ lastModified: 2025-01-15 14:00:00
```

### Paso 2: Click en "Actualizar Base"
```javascript
// En Dashboard
document.getElementById('btn-actualizar-base').click()
```

### Paso 3: Ver Cambios en Modal
```
Modal muestra:
┌──────────────────────────────────────┐
│ Sincronización Completada             │
│ ─────────────────────────────────────│
│ ✅ Actualizados: 3                   │
│ ✅ Creados: 1                        │
│ Cambios: 4 total                      │
│ ─────────────────────────────────────│
│                                      │
│ SKU-123 - Actualizado                │
│ Stock: 50 → 75                       │
│                                      │
│ SKU-456 - Nuevo                      │
│ (sin detalles para nuevos)            │
│                                      │
│ [← Anterior] [Siguiente →]           │
│ Página 1 de 2                         │
└──────────────────────────────────────┘
```

---

## 🔍 Detalles Técnicos

### Archivos Modificados

#### `Backend/index.php`
```php
// ANTES:
case 'sincronizar-firebase': require __DIR__ . '/SincronizarFirebaseMock.php'; break;

// AHORA:
case 'sincronizar-firebase': require __DIR__ . '/SincronizarFirebase.php'; break;
```

#### `Backend/SincronizarFirebase.php`
```php
// Agregado al inicio:
require_once __DIR__ . '/Cache.php';
require_once __DIR__ . '/CacheInvalidator.php';

// En el loop de cambios:
$cacheInvalidator->invalidarProducto($sku); // Para cada cambio

// Después de actualizar BD:
$cache->delete('dashboard_kpis');
$cache->delete('notificaciones_productos');
$cache->delete('ranking_metodos_pago');
```

### Firebase Requirements
```
✅ archivo-credentials.json debe existir en Backend/
✅ Firestore database debe estar activo en Firebase Console
✅ Colección 'productos' debe existir
✅ Campo 'lastModified' es recomendado (para filtrar por fecha)
```

### MySQL Requirements
```
✅ Tabla 'productos' con campos:
   - sku (PRIMARY KEY)
   - titulo
   - precio_venta
   - stock
   - variantes
   - descripcion
   - categoria
   - estado

✅ Tabla 'config' con:
   - clave = 'ultima_sincronizacion_firebase'
   - valor = datetime de última sincronización
```

---

## 🧪 Testing

### Test 1: Sincronizar cambios reales

```bash
# 1. En Firebase, cambiar un producto
Firebase Console:
productos > SKU-ABC-123 > Stock: 100 → 150

# 2. En Dashboard, click "Actualizar Base"
# 3. Verificar modal muestra el cambio

✅ Esperado:
- Modal muestra: "SKU-ABC-123 - Actualizado"
- stock: 100 → 150
- MySQL updated
- Caché invalidado
```

### Test 2: Crear producto nuevo en Firebase

```bash
# 1. En Firebase, crear documento nuevo
Firebase Console:
productos > SKU-NUEVO-999 > {datos completos}

# 2. Click "Actualizar Base"
# 3. Verificar modal

✅ Esperado:
- Modal muestra: "SKU-NUEVO-999 - Nuevo"
- MySQL tiene nuevo registro
- Producto aparece en lista
```

### Test 3: Caché se invalida correctamente

```bash
# 1. Cargar Dashboard (caché creado)
ls -la /tmp/cimehijo_cache/dashboard_kpis.json
# ✅ Archivo existe

# 2. Click "Actualizar Base"
# 3. Verificar caché
ls -la /tmp/cimehijo_cache/dashboard_kpis.json
# ❌ Archivo NO existe (fue eliminado)

# 4. Recargar Dashboard
# 5. Verificar caché nuevo
ls -la /tmp/cimehijo_cache/dashboard_kpis.json
# ✅ Archivo re-creado
```

### Test 4: Performance post-sincronización

```bash
# 1. Click "Actualizar Base"
# 2. Esperar a que termine
# 3. Recargar Dashboard (Network tab)

Esperado:
- Primera carga post-sync: ~108ms (sin caché)
- Segunda carga: ~42ms (con caché nuevo)
- Confirmación: 2.5x más rápido después de recrear caché
```

---

## ⚠️ Consideraciones Importantes

### Conflictos de Datos
```
¿Qué pasa si hay conflicto (Firebase y MySQL diferentes)?

Política de Sincronización:
→ Firebase es la FUENTE PRINCIPAL
→ MySQL se actualiza con datos de Firebase
→ Cambios en MySQL se pierden si Firebase tiene valor diferente

Recomendación:
- Editar productos en Firebase primero
- Sincronizar con "Actualizar Base"
- Usar MySQL como COPIA
```

### Que NO Sincroniza
```
❌ Productos eliminados en MySQL
   (Solo crea y actualiza, no elimina)

❌ Cambios hechos en MySQL sin actualizar Firebase
   (Se sobrescriben en próxima sincronización)

❌ Campos no mapeados
   (Solo los 8 campos principales: sku, titulo, precio, stock, etc)
```

### Sincronización Unidireccional
```
Firebase → MySQL: ✅ SÍ
MySQL → Firebase: ❌ NO (solo lectura en Sync)

Para actualizar Firebase desde MySQL:
- Usar Productos.php POST (ya actualiza Firebase)
- O admin panel de Firebase
```

---

## 📊 Flujo de Datos

```
ESCENARIO: Usuario edita producto en Firebase

Timeline:
─────────────────────────────────────────────────────
t=0
├─ Firebase: SKU-123 Stock = 50
└─ MySQL: SKU-123 Stock = 50

t=10 (Admin edita en Firebase)
├─ Firebase: SKU-123 Stock = 75 ← CAMBIO
└─ MySQL: SKU-123 Stock = 50    ← AÚN VIEJO

t=20 (Usuario hace click "Actualizar Base")
├─ Lee Firebase: Stock = 75
├─ Compara con MySQL: Stock = 50
├─ Detecta cambio: 50 → 75
├─ UPDATE MySQL
├─ invalidarProducto('SKU-123')
├─ DELETE /tmp/cimehijo_cache/dashboard_kpis.json
└─ Responde con cambios detectados

t=25
├─ Frontend muestra modal con cambio
├─ Usuario ve: "SKU-123 Stock: 50 → 75"
└─ Motor está sincronizado

t=30 (Usuario recarga Dashboard)
├─ GET /reportes
├─ Caché no existe
├─ Consulta BD (MySQL actualizado)
├─ Crea caché nuevo
└─ Muestra datos actualizados ✓
```

---

## 🔐 Seguridad

```
✅ Firebase credentials.json protegido
   - No incluido en git
   - Solo en servidor backend
   - Lectura solo desde PHP (no desde frontend)

✅ Endpoint /sincronizar-firebase 
   - Requiere POST
   - Valida conexión a BD
   - Usa transacciones para integridad

✅ Caché con invalidación selectiva
   - No guarda datos sensibles
   - JSON en /tmp (permisos 755)
   - Auto-limpieza en 5-10 minutos
```

---

## 🚀 Próximos Pasos

### Inmediato
1. Verificar firebase-credentials.json en Backend/
2. Probar sincronización manual
3. Validar cambios en modal
4. Confirmar caché se invalida

### Mejoras Futuras
1. Sincronización automática cada X minutos
2. Webhook de Firebase para sincronización en tiempo real
3. Bidireccional (MySQL → Firebase también)
4. Historial de sincronizaciones
5. Alertas si sincronización falla

---

## 📚 Documentación Relacionada

- **QUICK_START_GUIDE.md** - Cómo usar el caché
- **CACHE_REFERENCE.md** - Referencia técnica del caché
- **ARCHITECTURE_DIAGRAMS.md** - Flujos de datos
- **SincronizarFirebase.php** - Código de sincronización

---

**Versión**: 1.0  
**Fecha**: Enero 2025  
**Estado**: Firebase Real + Caché Integrado  
**Botón**: ✅ Conectado a Firebase
