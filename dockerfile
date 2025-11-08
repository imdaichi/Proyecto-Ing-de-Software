# 1. Empezamos con una imagen oficial de PHP 8.0 con servidor Apache
FROM php:8.0-apache

# 2. Instalamos las dependencias necesarias para sodium y otras extensiones
RUN apt-get update && apt-get install -y \
    zlib1g-dev \
    libz-dev \
    libsodium-dev \
    libssl-dev \
    && docker-php-ext-install sodium bcmath \
    && rm -rf /var/lib/apt/lists/*
    
# 3. Instalamos las extensiones de PHP (¡La parte mágica!)
RUN pecl install grpc
RUN docker-php-ext-enable grpc
RUN docker-php-ext-install sodium
RUN docker-php-ext-install bcmath

# 3. Habilitamos mod_rewrite de Apache
RUN a2enmod rewrite

# 4. Copiamos el código
COPY . /var/www/html/

# 6. Permisos
RUN chown -R www-data:www-data /var/www/html