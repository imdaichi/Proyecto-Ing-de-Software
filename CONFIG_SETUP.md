# Configuración de Archivos Sensibles

Este proyecto requiere archivos de configuración con credenciales que **NO** están en el repositorio por seguridad.

## Archivos Requeridos

### 1. `Backend/Config/db.php`
Copia el archivo `db.php.example` y renómbralo a `db.php`:
```bash
cp Backend/Config/db.php.example Backend/Config/db.php
```

### 2. `Backend/Config/email.php`
Copia el archivo `email.php.example` y renómbralo a `email.php`:
```bash
cp Backend/Config/email.php.example Backend/Config/email.php
```

Luego edita el archivo y configura tu API Key de SendGrid:
- Regístrate en: https://signup.sendgrid.com/
- Obtén tu API Key
- Reemplaza `TU_API_KEY_AQUI` con tu clave real

### 3. `Backend/firebase-credentials.json`
Si usas Firebase, coloca tu archivo de credenciales en `Backend/firebase-credentials.json`

⚠️ **IMPORTANTE**: Nunca hagas commit de estos archivos con credenciales reales
