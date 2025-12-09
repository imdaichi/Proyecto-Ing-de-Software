-- Tabla para configuración de notificaciones
CREATE TABLE IF NOT EXISTS config_notificaciones (
    id INT PRIMARY KEY DEFAULT 1,
    dias_stock_bajo INT DEFAULT 3,
    dias_sin_ventas INT DEFAULT 80,
    dias_periodo_gracia INT DEFAULT 21,
    fecha_actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar valores por defecto si no existen
INSERT INTO config_notificaciones (id, dias_stock_bajo, dias_sin_ventas, dias_periodo_gracia) 
VALUES (1, 3, 80, 21) 
ON DUPLICATE KEY UPDATE id=1;
