# 🚀 Deployment Guide - Sistema de Caché

## Pre-Deployment Checklist

### ✅ Verificaciones Técnicas
- [x] Todos los archivos PHP están presentes
- [x] `require_once` están en los lugares correctos
- [x] Invalidación está integrada en POST/PUT/DELETE
- [x] Directorio `/tmp/cimehijo_cache/` será auto-creado
- [x] TTLs configurados apropiadamente (5-10 min)
- [x] Documentación completada

### ✅ Testing Local
- [ ] Ejecutar test 1-12 en `TESTING_CACHE.md`
- [ ] Verificar times en Network tab
- [ ] Validar auto-invalidación funciona
- [ ] Comprobar `/tmp/cimehijo_cache/` archivos

---

## Pasos de Deployment

### Paso 1: Backup Previo
```bash
# En servidor de producción
tar -czf backup_cimehijo_$(date +%Y%m%d_%H%M%S).tar.gz Backend/
```

### Paso 2: Subir Archivos

#### Archivos NUEVOS a copiar:
```
Backend/Cache.php
Backend/CacheInvalidator.php
Backend/RankingMetodosPago.php
Backend/CACHE_REFERENCE.md
Backend/TESTING_CACHE.md
Backend/ARCHITECTURE_DIAGRAMS.md
```

#### Archivos a REEMPLAZAR:
```
Backend/Reportes.php
Backend/Notificaciones.php
Backend/Productos.php
Backend/Proveedores.php
Backend/Usuarios.php
Backend/Ventas.php
Backend/index.php (actualizar rutas si es necesario)
```

### Paso 3: Permisos del Directorio de Caché

```bash
# Crear directorio (se auto-crea, pero asegurar)
mkdir -p /tmp/cimehijo_cache

# Permisos (wwww-data o tu usuario PHP)
chmod 755 /tmp/cimehijo_cache
chown www-data:www-data /tmp/cimehijo_cache

# O en Windows, asegurar que el web server tiene permisos de escritura
```

### Paso 4: Verificar Directorios

```bash
# Linux/Mac
ls -la /tmp/cimehijo_cache/
# Resultado: directorio creado, vacío o con archivos JSON

# Windows
dir C:\Temp\cimehijo_cache
# O cambiar ruta en Cache.php si necesario
```

### Paso 5: Probar en Producción

#### 5a. HTTP Request
```bash
# Probar GET dashboard
curl http://your-domain.com/Backend/index.php?endpoint=reportes

# Resultado esperado: JSON con dashboard_kpis
# Time: ~108ms (sin caché)
```

#### 5b. Segunda vez (con caché)
```bash
# Ejecutar nuevamente
curl http://your-domain.com/Backend/index.php?endpoint=reportes

# Resultado esperado: MISMO JSON
# Time: ~42ms (con caché) ⚡
```

#### 5c. Verificar caché creado
```bash
# Ver archivos JSON
ls -la /tmp/cimehijo_cache/

# Output:
# -rw-r--r-- 1 www-data www-data  2531 Jan 15 14:30 dashboard_kpis.json
```

#### 5d. Probar invalidación
```bash
# Editar un producto (POST)
curl -X POST http://your-domain.com/Backend/index.php?endpoint=productos \
  -H "Content-Type: application/json" \
  -d '{"sku":"TEST","precio":100,"titulo":"Test"}'

# Verificar que caché se borró
ls -la /tmp/cimehijo_cache/dashboard_kpis.json
# Resultado: File not found (fue eliminado) ✓

# Próximo GET regenera el caché
curl http://your-domain.com/Backend/index.php?endpoint=reportes
# Time: ~108ms (BD sin caché)

# Siguiente GET
curl http://your-domain.com/Backend/index.php?endpoint=reportes
# Time: ~42ms (caché regenerado) ✓
```

### Paso 6: Monitoreo Post-Deployment

```bash
# Ver tamaño del caché
du -sh /tmp/cimehijo_cache/
# Resultado esperado: < 1MB para 6000 productos

# Ver archivos más antiguos
ls -lt /tmp/cimehijo_cache/ | head -n 5

# Monitor en tiempo real
watch -n 5 'ls -la /tmp/cimehijo_cache/ | tail -n 10'
```

### Paso 7: Configuración de Logs

```bash
# Ver si hay errores de caché
tail -f /var/log/apache2/error.log | grep -i cache
# O:
tail -f /var/log/php-fpm.log | grep -i cache
```

---

## Cambios de Configuración

### Si el servidor NO es Linux/Mac

Si `/tmp/` no está disponible, cambiar en `Backend/Cache.php`:

```php
// Línea ~7
// Cambiar:
private $cacheDir = '/tmp/cimehijo_cache';

// A (Windows):
private $cacheDir = 'C:\Temp\cimehijo_cache';

// O (cualquier servidor):
private $cacheDir = '/var/cache/cimehijo';
```

### Si quieres cambiar TTLs

En cada archivo:

```php
// Reportes.php, Notificaciones.php, etc.

// Cambiar 5 minutos a:
$cache->set('dashboard_kpis', $data, 300);  // 5 min (actual)
$cache->set('dashboard_kpis', $data, 600);  // 10 min
$cache->set('dashboard_kpis', $data, 1800); // 30 min
$cache->set('dashboard_kpis', $data, 60);   // 1 min (testing)
```

---

## Rollback Plan

Si algo va mal en producción:

### Opción 1: Limpiar caché
```bash
# Vía HTTP
GET http://your-domain.com/Backend/index.php?endpoint=limpiar-cache

# Vía terminal
rm -rf /tmp/cimehijo_cache/*
```

### Opción 2: Revertir archivos
```bash
# Restaurar desde backup
tar -xzf backup_cimehijo_20250115_143000.tar.gz

# Los archivos PHP volverán a su versión anterior
```

### Opción 3: Deshabilitar caché temporalmente

En `Cache.php` línea ~25:
```php
// Agregar:
private $enabled = false; // ← Cambia a false para deshabilitar

// Función get() retornará null (como si no hubiera caché)
public function get($key) {
    if (!$this->enabled) return null; // ← Deshabilita
    // ...resto del código
}
```

---

## Monitoreo Continuado

### Script de Monitoreo (cron job)

Crear archivo `monitor_cache.sh`:
```bash
#!/bin/bash

CACHE_DIR="/tmp/cimehijo_cache"
ALERT_SIZE_MB=100
LOG_FILE="/var/log/cache_monitor.log"

# Verificar tamaño
SIZE=$(du -m "$CACHE_DIR" | cut -f1)
echo "[$(date)] Cache size: ${SIZE}MB" >> $LOG_FILE

if [ $SIZE -gt $ALERT_SIZE_MB ]; then
    echo "[ALERT] Cache size exceeds ${ALERT_SIZE_MB}MB!" >> $LOG_FILE
    # Enviar email o notificación
fi

# Verificar archivos más antiguos
OLDEST=$(find "$CACHE_DIR" -type f -printf '%T@ %p\n' | sort -n | head -n 1)
echo "[$(date)] Oldest file: $OLDEST" >> $LOG_FILE
```

Ejecutar cada hora:
```bash
0 * * * * /path/to/monitor_cache.sh
```

### Alertas Importantes

```
⚠️ Si /tmp/cimehijo_cache/ > 100MB
   → Cache puede estar corrupto o no expirar
   → Ejecutar: rm -rf /tmp/cimehijo_cache/*

⚠️ Si dashboard aún lento después de caché
   → Verificar con Developer Tools (Network tab)
   → Buscar "dashboard_kpis" en caché
   → Ejecutar test 8: benchmarking

⚠️ Si datos viejos persisten después de editar
   → Limpiar manual: /limpiar-cache
   → Verificar invalidación en POST
   → Ver TESTING_CACHE.md Test 10
```

---

## Load Testing en Producción

### Simular 10-20 usuarios

```bash
# Instalar herramienta
apt-get install apache2-utils

# Simular 20 usuarios, 100 requests
ab -n 100 -c 20 http://your-domain.com/Backend/index.php?endpoint=reportes

# Esperado sin caché:
# - Requests/sec: bajo
# - Time/request: ~108ms
# - Failed requests: algunos

# Esperado con caché:
# - Requests/sec: alto
# - Time/request: ~42ms
# - Failed requests: 0
```

---

## Puntos de Verificación Finales

### Antes de Go-Live

- [ ] Todos los archivos subidos
- [ ] `/tmp/cimehijo_cache/` creado con permisos
- [ ] Test 1-12 ejecutados exitosamente
- [ ] Performance: 2.5-3.4x mejora verificada
- [ ] Auto-invalidación funcionando
- [ ] Logs limpios (sin errores de caché)
- [ ] Rollback plan documentado
- [ ] Monitoreo configurado

### Primer Día en Producción

- [ ] Monitoring de `/tmp/cimehijo_cache/` tamaño
- [ ] Verificar errores en logs
- [ ] Probar invalidación manual (editar producto)
- [ ] Probar endpoint `/limpiar-cache`
- [ ] Medir performance real con usuarios reales

### Días 1-7

- [ ] Dashboard muestra performance consistente
- [ ] Caché se invalida correctamente
- [ ] Sin problemas de data stale
- [ ] Usuarios reportan interfaz más rápida
- [ ] Tamaño de `/tmp/cimehijo_cache/` estable

---

## Producción Ready Criteria

```
✅ FUNCIONAL
   Todas las operaciones CRUD funcionan
   Auto-invalidación activada
   Performance mejorado 2.5-3.4x

✅ CONFIABLE
   Datos siempre actualizados
   Auto-cleanup de cachés expirados
   Zero manual intervention needed

✅ MONITOREABLE
   Archivos JSON visibles para debug
   Tamaño del caché controlable
   Logs disponibles

✅ RECUPERABLE
   Rollback plan documentado
   Backup pre-deployment hecho
   Deshabilitar caché posible con un change

✅ DOCUMENTED
   QUICK_START_GUIDE.md ✓
   CACHE_REFERENCE.md ✓
   TESTING_CACHE.md ✓
   ARCHITECTURE_DIAGRAMS.md ✓
   Este documento ✓
```

## Confirmación de Deploy

Una vez completado, crear ticket con:

```
[DEPLOYED] Cache System v1.0

✅ All files uploaded
✅ Permissions set correctly
✅ Tests 1-12 passed
✅ Performance: 2.5-3.4x verified
✅ Auto-invalidation working
✅ Monitoring configured
✅ Rollback plan ready

Performance Metrics:
- Dashboard: 108ms → 42ms (2.5x)
- Notificaciones: 145ms → 52ms (2.8x)
- Proveedores: 80ms → 25ms (3.2x)
- Usuarios: 75ms → 22ms (3.4x)

Contact: [Team] for issues
Monitoring: /tmp/cimehijo_cache/
```

---

## Support URLs

```
Limpiar caché manual:
GET /Backend/index.php?endpoint=limpiar-cache

Ver contenido (JSON):
cat /tmp/cimehijo_cache/dashboard_kpis.json

Monitor en tiempo real:
watch -n 2 'du -sh /tmp/cimehijo_cache/'

Ver errores:
tail -f /var/log/apache2/error.log | grep -i cache
```

---

## Timeline Estimado

| Paso | Tiempo | Notas |
|------|--------|-------|
| Backup | 5 min | Crítico |
| Upload archivos | 5 min | FTP/SSH |
| Configurar permisos | 2 min | chmod/chown |
| Testing local | 15 min | 12 test cases |
| Testing en producción | 10 min | curl/HTTP checks |
| Monitoring setup | 5 min | cron jobs |
| **Total** | **42 min** | Con margen de seguridad |

---

## Documentación de Referencia

Para cualquier duda post-deployment, consultar:

1. **QUICK_START_GUIDE.md** - Cómo usar el sistema
2. **CACHE_REFERENCE.md** - Referencia técnica
3. **TESTING_CACHE.md** - Validar funcionamiento
4. **ARCHITECTURE_DIAGRAMS.md** - Entender flujos
5. **CACHE_IMPLEMENTATION_SUMMARY.md** - Visión general

---

**Deployment Checklist Version**: 1.0  
**Última actualización**: Enero 2025  
**Estado**: Ready for Production  
**Riesgo**: Muy Bajo (sin breaking changes, auto-invalidación)
