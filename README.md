# Sistema de Inventario y Ventas - Cimehijo

Sistema web de gestión de inventario, ventas y reportes con sincronización a Firebase.

## 📚 Documentación Técnica Consolidada

### Sistema de Caché
El sistema implementa un **caché basado en archivos JSON** que mejora la performance 2.5-3x:
- **Dashboard KPIs**: 108ms → 42ms (caché de 5 minutos)
- **Notificaciones**: 145ms → 52ms (caché de 5 minutos)
- **Rankings**: 235ms → 78ms (caché de 5 minutos)
- **Productos individuales**: ~50ms → ~15ms (caché de 10 minutos)
- **Invalidación automática**: Al editar/crear/eliminar, el caché se limpia automáticamente
- **Archivos**: `Backend/Cache.php`, `Backend/CacheInvalidator.php`
- **Ubicación**: `/tmp/cimehijo_cache/`

### Sincronización Firebase
Sistema de sincronización bidireccional con Firebase:
- Detecta cambios en productos desde Firebase (últimos 2 días)
- Actualiza MySQL con datos de Firebase automáticamente
- Modal con resultados paginados (7 items por página)
- Visualización detallada de cambios campo por campo
- Transacciones atómicas para seguridad de datos
- **Archivos**: `Backend/SincronizarFirebase.php`

### Sistema de Notificaciones Multi-Alerta
Monitoreo inteligente de inventario con 3 tipos de alertas configurables:
- **🔴 Stock Bajo** (Prioridad ALTA): Productos con menos de X unidades
- **🟡 Sin Ventas** (Prioridad MEDIA): Productos sin movimiento en X días
- **🔵 Período de Gracia** (Prioridad BAJA): Productos nuevos en período de evaluación
- **Configuración dinámica**: Ajustable desde el dashboard sin modificar código
- **Archivos**: `Backend/Notificaciones.php`, `Backend/ConfigNotificaciones.php`

### Recuperación de Contraseña
Sistema de recuperación basado en tokens de seguridad:
- Tokens aleatorios de 32 caracteres (SHA-256)
- Expiración de 1 hora
- Uso único (token se marca como usado después de cambiar contraseña)
- Links clickeables generados en pantalla (entorno local sin email)
- **Archivos**: `Backend/GenerarTokenRecuperacion.php`, `Backend/ValidarTokenRecuperacion.php`, `Backend/CambiarPasswordRecuperacion.php`
- **Frontend**: `recuperar-password.html`, `reset-password.html`

### Zona Horaria
Sistema configurado para **America/Santiago (UTC-3)**:
- Docker container con `TZ=America/Santiago`
- PHP usando `date_default_timezone_set('America/Santiago')`
- Timestamps en ventas y productos respetan timezone local
- **Archivos**: `docker-compose.yml`, `Backend/Ventas.php`, `Backend/Productos.php`

### Configuración de Archivos Sensibles
Archivos requeridos que NO están en el repositorio por seguridad:
- `Backend/Config/db.php` - Conexión a base de datos
- `Backend/Config/email.php` - API Key de SendGrid (opcional)
- `Backend/firebase-credentials.json` - Credenciales de Firebase
- ⚠️ Copiar desde `.example` y configurar antes del primer uso

## 🚀 Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [Git](https://git-scm.com/downloads) instalado
- Credenciales de Firebase (archivo JSON)

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/Proyecto-Ing-de-Software.git
cd Proyecto-Ing-de-Software
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` y cambia las contraseñas:
```
MYSQL_ROOT_PASSWORD=tu_contraseña_segura
MYSQL_PASSWORD=tu_contraseña_segura
```

### 3. Configurar Firebase

1. Descarga tu archivo de credenciales de Firebase desde la consola de Firebase
2. Renómbralo a `firebase-credentials.json`
3. Colócalo en la carpeta `Backend/`

### 4. Construir y ejecutar con Docker

**IMPORTANTE**: La primera construcción tomará ~45 minutos (instala extensión gRPC).

```bash
docker-compose up -d --build
```

Esto iniciará:
- **MySQL** en puerto 3306
- **Backend PHP** en puerto 8080
- **Frontend** en puerto 80

### 5. Importar base de datos

Una vez iniciados los contenedores:

```bash
# Opción 1: Usar el script SQL
docker exec -i mysql-container mysql -uroot -p[TU_PASSWORD] cimehijo < Backend/Database.sql.txt

# Opción 2: Importar CSV manualmente
# Acceder a: http://localhost:8080/importar_manual.php
```

### 6. Acceder al sistema

- **Frontend**: http://localhost/
- **Dashboard**: http://localhost/Dashboard/
- **Ventas (TPV)**: http://localhost/Ventas/

## 🔧 Comandos útiles

```bash
# Ver logs de los contenedores
docker-compose logs -f

# Detener contenedores
docker-compose down

# Reconstruir después de cambios en dockerfile
docker-compose up -d --build

# Acceder al contenedor PHP
docker exec -it backend-container bash

# Instalar dependencias PHP (si es necesario)
docker exec -it backend-container composer install
```

## 📁 Estructura del proyecto

```
.
├── Backend/
│   ├── Config/
│   │   └── db.php              # Configuración de base de datos
│   ├── Login.php               # Autenticación
│   ├── Ventas.php              # Endpoint de ventas
│   ├── Productos.php           # CRUD de productos
│   ├── Movimientos.php         # Bitácora
│   ├── Reportes.php            # Reportes y exportación
│   ├── dockerfile              # Imagen PHP con gRPC
│   └── firebase-credentials.json  # (NO SUBIR A GIT)
├── Frontend/
│   ├── Dashboard/              # Panel de administración
│   ├── Ventas/                 # Terminal de punto de venta
│   └── index.html              # Login
├── docker-compose.yml          # Orquestación de contenedores
└── .env                        # Variables de entorno (NO SUBIR A GIT)
```

## 🔥 Firebase

El sistema sincroniza automáticamente:
- **Ventas → Firebase**: Disminuye stock en Firestore
- **Ediciones → Firebase**: Actualiza productos en Firestore

Colección: `productos`  
Documento ID: `SKU del producto`

## 👥 Credenciales por defecto

Estas se configuran al importar la base de datos. **Cámbialas en producción**.

## 🐛 Solución de problemas

### Error "gRPC extension not found"
- Asegúrate de haber construido la imagen con `--build`
- La construcción debe completarse sin errores

### Error de conexión a MySQL
- Verifica que `.env` tenga las contraseñas correctas
- Confirma que el contenedor MySQL esté corriendo: `docker ps`

### Firebase no sincroniza
- Verifica que `firebase-credentials.json` esté en `Backend/`
- Revisa logs: `docker-compose logs backend`

## 📝 Notas para desarrollo

- Los cambios en PHP requieren reiniciar el contenedor: `docker-compose restart backend`
- Los cambios en frontend se reflejan inmediatamente (solo refresca el navegador)
- Usa `.gitignore` para evitar subir archivos sensibles

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
2. Commit tus cambios: `git commit -m 'Agrega nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

## 📄 Licencia

[Especifica tu licencia aquí]
