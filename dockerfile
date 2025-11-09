# ==================================
# Dockerfile v4.0 (El Correcto, "Lento pero Seguro")
# ==================================

# 1. Empezamos con PHP 8.0
FROM php:8.0-apache

# 2. Instalamos las dependencias de Linux necesarias para
#    las extensiones y para pecl.
RUN apt-get update && apt-get install -y \
    unzip \
    libz-dev \
    libsodium-dev \
    --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

# 3. Instalamos las extensiones "core" (bcmath, sodium)
#    Este es el método nativo de Docker.
RUN docker-php-ext-install bcmath
RUN docker-php-ext-install sodium

# 4. Instalamos gRPC (¡EL PASO LENTO DE 4000s!)
#    Esto es inevitable, pero solo se hace UNA VEZ.
RUN pecl install grpc
RUN docker-php-ext-enable grpc

# 5. Instalamos Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# 6. Establecemos el directorio de trabajo
WORKDIR /var/www/html

# 7. Copiamos SOLO los archivos de composer
COPY composer.json composer.lock ./

# 8. Ejecutamos 'composer install'
#    (Ahora SÍ funcionará: tenemos PHP 8.0, sodium, bcmath, y grpc)
RUN composer install --no-dev --no-interaction --optimize-autoloader

# 9. Habilitamos mod_rewrite (para el 404 Not Found)
RUN a2enmod rewrite

# 10. Copiamos el resto de tu código (.php, .htaccess, etc)
COPY . /var/www/html/

# 11. Damos permisos
RUN chown -R www-data:www-data /var/www/html