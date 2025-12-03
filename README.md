# Sistema de Inventario y Ventas - Cimehijo

Sistema web de gestión de inventario, ventas y reportes con sincronización a Firebase.

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
