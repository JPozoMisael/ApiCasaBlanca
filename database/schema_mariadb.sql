-- =====================================================================
-- Salinas Booking · Esquema completo de la base de datos · MariaDB / MySQL
-- GENERADO por "npm run db:schema:sql" a partir de los modelos de Sequelize. No editar a mano:
-- si cambias un modelo, vuelve a generar este archivo en vez de tocarlo directamente.
--
-- Qué hace: crea TODAS las tablas de la aplicación (sin datos). Es seguro repetirlo
-- (usa CREATE TABLE IF NOT EXISTS) y el orden de las tablas no importa porque las llaves
-- foráneas se crean con las comprobaciones desactivadas, igual que hace mysqldump.
--
-- Qué NO hace: no crea roles/permisos/menú (eso es database/rbac_mariadb.sql, generado por
-- "npm run db:sql") ni usuarios, zonas o datos de ejemplo (eso requiere "npm run db:seed" o
-- "npm run db:seed:demo" desde Node, porque las contraseñas se cifran con bcrypt al crearlas).
--
-- Orden de instalación en una base nueva:
--   1) este archivo (schema_mariadb.sql)
--   2) database/rbac_mariadb.sql
--   3) npm run db:seed   (o db:seed:demo)
--
-- Uso: mariadb -u USUARIO -p NOMBRE_BD < database/schema_mariadb.sql
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- zonas
CREATE TABLE IF NOT EXISTS `zonas` (`id` INTEGER auto_increment , `nombre` VARCHAR(80) NOT NULL, `slug` VARCHAR(100) NOT NULL UNIQUE, `descripcion` TEXT, `parroquia` VARCHAR(80), `latitud` DECIMAL(10,7), `longitud` DECIMAL(10,7), `imagen_url` VARCHAR(500), `orden` INTEGER NOT NULL DEFAULT 0, `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB;

-- amenidades
CREATE TABLE IF NOT EXISTS `amenidades` (`id` INTEGER auto_increment , `nombre` VARCHAR(80) NOT NULL, `slug` VARCHAR(100) NOT NULL UNIQUE, `icono` VARCHAR(50), `categoria` ENUM('general', 'habitacion', 'exterior', 'servicio', 'accesibilidad') NOT NULL DEFAULT 'general', `filtrable` TINYINT(1) NOT NULL DEFAULT true, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB;

-- permisos
CREATE TABLE IF NOT EXISTS `permisos` (`id` INTEGER auto_increment , `clave` VARCHAR(60) NOT NULL UNIQUE, `modulo` VARCHAR(40) NOT NULL, `descripcion` VARCHAR(200) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB;

-- roles
CREATE TABLE IF NOT EXISTS `roles` (`id` INTEGER auto_increment , `clave` VARCHAR(30) NOT NULL UNIQUE, `nombre` VARCHAR(60) NOT NULL, `descripcion` VARCHAR(255), `alcance` ENUM('plataforma', 'hotel', 'cliente') NOT NULL DEFAULT 'hotel', `es_sistema` TINYINT(1) NOT NULL DEFAULT false, `asignable_por_hotel` TINYINT(1) NOT NULL DEFAULT false, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB;

-- rol_permisos
CREATE TABLE IF NOT EXISTS `rol_permisos` (`rol_id` INTEGER , `permiso_id` INTEGER , PRIMARY KEY (`rol_id`, `permiso_id`), FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- menu_items
CREATE TABLE IF NOT EXISTS `menu_items` (`id` INTEGER auto_increment , `clave` VARCHAR(40) NOT NULL UNIQUE, `texto` VARCHAR(60) NOT NULL, `icono` VARCHAR(40), `ruta` VARCHAR(120) NOT NULL, `seccion` VARCHAR(40) NOT NULL DEFAULT 'Gestión', `orden` INTEGER NOT NULL DEFAULT 0, `permiso_id` INTEGER, `activo` TINYINT(1) NOT NULL DEFAULT true, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- hoteles
CREATE TABLE IF NOT EXISTS `hoteles` (`id` INTEGER auto_increment , `nombre` VARCHAR(100) NOT NULL, `slug` VARCHAR(120) NOT NULL UNIQUE, `zona_id` INTEGER, `tipo_alojamiento` ENUM('hotel', 'hostal', 'hosteria', 'apart_hotel', 'cabana', 'villa', 'departamento') NOT NULL DEFAULT 'hotel', `descripcion` TEXT, `direccion` VARCHAR(200), `ciudad` VARCHAR(50) NOT NULL DEFAULT 'Salinas', `pais` VARCHAR(50) NOT NULL DEFAULT 'Ecuador', `latitud` DECIMAL(10,7), `longitud` DECIMAL(10,7), `telefono` VARCHAR(20), `whatsapp` VARCHAR(20), `email` VARCHAR(100), `sitio_web` VARCHAR(200), `estrellas` TINYINT, `imagen_principal` VARCHAR(500), `hora_checkin` VARCHAR(5) NOT NULL DEFAULT '14:00', `hora_checkout` VARCHAR(5) NOT NULL DEFAULT '12:00', `politica_cancelacion` ENUM('flexible', 'moderada', 'estricta') NOT NULL DEFAULT 'moderada', `comision_porcentaje` DECIMAL(5,2) NOT NULL DEFAULT 10, `destacado` TINYINT(1) NOT NULL DEFAULT false, `rating_promedio` DECIMAL(3,1) NOT NULL DEFAULT 0, `total_valoraciones` INTEGER NOT NULL DEFAULT 0, `estado` ENUM('activo', 'inactivo', 'pendiente') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- hotel_amenidades
CREATE TABLE IF NOT EXISTS `hotel_amenidades` (`hotel_id` INTEGER , `amenidad_id` INTEGER , PRIMARY KEY (`hotel_id`, `amenidad_id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`amenidad_id`) REFERENCES `amenidades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- imagenes
CREATE TABLE IF NOT EXISTS `imagenes` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `tipo_habitacion_id` INTEGER, `url` VARCHAR(500) NOT NULL, `alt` VARCHAR(200), `orden` INTEGER NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`tipo_habitacion_id`) REFERENCES `tipos_habitacion` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- favoritos
CREATE TABLE IF NOT EXISTS `favoritos` (`id` INTEGER auto_increment , `user_id` INTEGER NOT NULL, `hotel_id` INTEGER NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- tipos_habitacion
CREATE TABLE IF NOT EXISTS `tipos_habitacion` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `nombre` VARCHAR(100) NOT NULL, `descripcion` TEXT, `capacidad_maxima` INTEGER NOT NULL, `metros_cuadrados` DECIMAL(5,2), `camas_sencillas` INTEGER NOT NULL DEFAULT 0, `camas_dobles` INTEGER NOT NULL DEFAULT 0, `tiene_vista` TINYINT(1) NOT NULL DEFAULT false, `precio_base` DECIMAL(10,2) NOT NULL DEFAULT 0, `desayuno_incluido` TINYINT(1) NOT NULL DEFAULT false, `tiene_balcon` TINYINT(1) NOT NULL DEFAULT false, `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- tipo_habitacion_amenidades
CREATE TABLE IF NOT EXISTS `tipo_habitacion_amenidades` (`tipo_habitacion_id` INTEGER , `amenidad_id` INTEGER , PRIMARY KEY (`tipo_habitacion_id`, `amenidad_id`), FOREIGN KEY (`tipo_habitacion_id`) REFERENCES `tipos_habitacion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`amenidad_id`) REFERENCES `amenidades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- habitaciones
CREATE TABLE IF NOT EXISTS `habitaciones` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `tipo_habitacion_id` INTEGER NOT NULL, `numero_habitacion` VARCHAR(10) NOT NULL, `piso` INTEGER, `estado` ENUM('disponible', 'ocupada', 'mantenimiento', 'limpieza', 'inactiva') NOT NULL DEFAULT 'disponible', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`tipo_habitacion_id`) REFERENCES `tipos_habitacion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- bloqueos_habitaciones
CREATE TABLE IF NOT EXISTS `bloqueos_habitaciones` (`id` INTEGER auto_increment , `habitacion_id` INTEGER NOT NULL, `fecha_inicio` DATE NOT NULL, `fecha_fin` DATE NOT NULL, `tipo_bloqueo` ENUM('mantenimiento', 'limpieza', 'reparacion', 'administrativo', 'otro') NOT NULL DEFAULT 'administrativo', `motivo` VARCHAR(200), `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- temporadas
CREATE TABLE IF NOT EXISTS `temporadas` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `nombre` VARCHAR(100) NOT NULL, `fecha_inicio` DATE NOT NULL, `fecha_fin` DATE NOT NULL, `tipo` ENUM('alta', 'media', 'baja') NOT NULL DEFAULT 'media', `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- tarifas_habitacion
CREATE TABLE IF NOT EXISTS `tarifas_habitacion` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `tipo_habitacion_id` INTEGER NOT NULL, `temporada_id` INTEGER NOT NULL, `tipo_dia` ENUM('entre_semana', 'fin_semana', 'feriado') NOT NULL DEFAULT 'entre_semana', `precio` DECIMAL(10,2) NOT NULL, `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`tipo_habitacion_id`) REFERENCES `tipos_habitacion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`temporada_id`) REFERENCES `temporadas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- servicios
CREATE TABLE IF NOT EXISTS `servicios` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `nombre` VARCHAR(100) NOT NULL, `descripcion` TEXT, `precio` DECIMAL(10,2) NOT NULL, `tipo` ENUM('habitacion', 'reserva', 'general') NOT NULL DEFAULT 'reserva', `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- users
CREATE TABLE IF NOT EXISTS `users` (`id` INTEGER auto_increment , `hotel_id` INTEGER, `nombre` VARCHAR(100) NOT NULL, `apellido` VARCHAR(100) NOT NULL, `email` VARCHAR(100) NOT NULL UNIQUE, `password` VARCHAR(255) NOT NULL, `rol` VARCHAR(30) NOT NULL DEFAULT 'cliente', `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `ultimo_login` DATETIME, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- clientes
CREATE TABLE IF NOT EXISTS `clientes` (`id` INTEGER auto_increment , `user_id` INTEGER UNIQUE, `nombres` VARCHAR(100) NOT NULL, `apellidos` VARCHAR(100) NOT NULL, `email` VARCHAR(100), `telefono` VARCHAR(20), `tipo_documento` ENUM('cedula', 'pasaporte', 'dni'), `documento_identidad` VARCHAR(50), `nacionalidad` VARCHAR(50), `fecha_nacimiento` DATE, `direccion` VARCHAR(200), `observaciones` TEXT, `estado` ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- reservas
CREATE TABLE IF NOT EXISTS `reservas` (`id` INTEGER auto_increment , `cliente_id` INTEGER NOT NULL, `hotel_id` INTEGER NOT NULL, `user_id` INTEGER, `codigo_reserva` VARCHAR(20) NOT NULL UNIQUE, `fecha_entrada` DATE NOT NULL, `fecha_salida` DATE NOT NULL, `num_huespedes` INTEGER NOT NULL DEFAULT 1, `num_ninos` INTEGER NOT NULL DEFAULT 0, `estado` ENUM('pendiente', 'confirmada', 'check_in', 'check_out', 'cancelada', 'no_show') NOT NULL DEFAULT 'pendiente', `canal` ENUM('web', 'recepcion', 'telefono', 'whatsapp') NOT NULL DEFAULT 'web', `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0, `impuestos` DECIMAL(10,2) NOT NULL DEFAULT 0, `precio_total` DECIMAL(10,2) NOT NULL DEFAULT 0, `comision` DECIMAL(10,2) NOT NULL DEFAULT 0, `politica_cancelacion` ENUM('flexible', 'moderada', 'estricta') NOT NULL DEFAULT 'moderada', `expira_en` DATETIME, `cancelada_en` DATETIME, `motivo_cancelacion` VARCHAR(300), `observaciones` TEXT, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- detalle_reservas
CREATE TABLE IF NOT EXISTS `detalle_reservas` (`id` INTEGER auto_increment , `reserva_id` INTEGER NOT NULL, `habitacion_id` INTEGER NOT NULL, `precio_noche` DECIMAL(10,2) NOT NULL, `noches` INTEGER NOT NULL DEFAULT 1, `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`habitacion_id`) REFERENCES `habitaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- reserva_servicios
CREATE TABLE IF NOT EXISTS `reserva_servicios` (`id` INTEGER auto_increment , `reserva_id` INTEGER NOT NULL, `servicio_id` INTEGER NOT NULL, `cantidad` INTEGER NOT NULL DEFAULT 1, `precio_unitario` DECIMAL(10,2) NOT NULL, `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- pagos
CREATE TABLE IF NOT EXISTS `pagos` (`id` INTEGER auto_increment , `reserva_id` INTEGER NOT NULL, `monto` DECIMAL(10,2) NOT NULL, `metodo` ENUM('tarjeta', 'stripe', 'efectivo', 'transferencia', 'paypal', 'deposito') NOT NULL, `estado` ENUM('pendiente', 'aprobado', 'rechazado', 'anulado') NOT NULL DEFAULT 'pendiente', `referencia` VARCHAR(100), `observaciones` TEXT, `fecha_pago` DATETIME NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- valoraciones
CREATE TABLE IF NOT EXISTS `valoraciones` (`id` INTEGER auto_increment , `reserva_id` INTEGER, `hotel_id` INTEGER NOT NULL, `user_id` INTEGER, `puntuacion` TINYINT NOT NULL, `titulo` VARCHAR(150), `comentario` TEXT, `respuesta_hotel` TEXT, `fecha` DATETIME NOT NULL, `estado` ENUM('publicada', 'oculta') NOT NULL DEFAULT 'publicada', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE, FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- configuraciones
CREATE TABLE IF NOT EXISTS `configuraciones` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `clave` VARCHAR(100) NOT NULL, `valor` TEXT, `tipo` ENUM('text', 'number', 'boolean', 'json') DEFAULT 'text', `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (`id` INTEGER auto_increment , `action` VARCHAR(100) NOT NULL, `user_id` INTEGER, `target_id` INTEGER, `target_type` VARCHAR(50), `old_value` JSON, `new_value` JSON, `details` JSON, `ip_address` VARCHAR(45), `user_agent` TEXT, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- canal_conexiones
CREATE TABLE IF NOT EXISTS `canal_conexiones` (`id` INTEGER auto_increment , `hotel_id` INTEGER NOT NULL, `proveedor` ENUM('siteminder') NOT NULL DEFAULT 'siteminder', `codigo_hotel` VARCHAR(40) NOT NULL UNIQUE, `estado` ENUM('pendiente', 'activa', 'pausada') NOT NULL DEFAULT 'pendiente', `moneda` VARCHAR(3) NOT NULL DEFAULT 'USD', `precios_incluyen_impuestos` TINYINT(1) NOT NULL DEFAULT true, `plan_tarifa_codigo` VARCHAR(20) NOT NULL DEFAULT 'BAR', `ultima_entrada_en` DATETIME, `ultimo_error` VARCHAR(500), `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`hotel_id`) REFERENCES `hoteles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- canal_mapeos
CREATE TABLE IF NOT EXISTS `canal_mapeos` (`id` INTEGER auto_increment , `conexion_id` INTEGER NOT NULL, `tipo_habitacion_id` INTEGER NOT NULL, `codigo_habitacion` VARCHAR(40) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`conexion_id`) REFERENCES `canal_conexiones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`tipo_habitacion_id`) REFERENCES `tipos_habitacion` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE) ENGINE=InnoDB;

-- canal_inventario
CREATE TABLE IF NOT EXISTS `canal_inventario` (`id` INTEGER auto_increment , `conexion_id` INTEGER NOT NULL, `hotel_id` INTEGER NOT NULL, `tipo_habitacion_id` INTEGER NOT NULL, `fecha` DATE NOT NULL, `disponibles` INTEGER, `vendidas_local` INTEGER NOT NULL DEFAULT 0, `precio` DECIMAL(10,2), `cerrado` TINYINT(1) NOT NULL DEFAULT false, `cerrado_llegada` TINYINT(1) NOT NULL DEFAULT false, `cerrado_salida` TINYINT(1) NOT NULL DEFAULT false, `min_estancia` INTEGER, `max_estancia` INTEGER, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`conexion_id`) REFERENCES `canal_conexiones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

-- canal_mensajes
CREATE TABLE IF NOT EXISTS `canal_mensajes` (`id` INTEGER auto_increment , `conexion_id` INTEGER, `hotel_id` INTEGER, `direccion` ENUM('entrada', 'salida') NOT NULL, `tipo` VARCHAR(60) NOT NULL, `resultado` ENUM('ok', 'error') NOT NULL, `echo_token` VARCHAR(64), `detalle` VARCHAR(500), `ms` INTEGER, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`conexion_id`) REFERENCES `canal_conexiones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB;

-- canal_salidas
CREATE TABLE IF NOT EXISTS `canal_salidas` (`id` INTEGER auto_increment , `conexion_id` INTEGER NOT NULL, `hotel_id` INTEGER NOT NULL, `reserva_id` INTEGER NOT NULL, `accion` ENUM('Commit', 'Cancel') NOT NULL, `estado` ENUM('pendiente', 'enviado', 'error', 'omitido') NOT NULL DEFAULT 'pendiente', `intentos` INTEGER NOT NULL DEFAULT 0, `proximo_intento` DATETIME NOT NULL, `ultimo_error` VARCHAR(500), `enviado_en` DATETIME, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, PRIMARY KEY (`id`), FOREIGN KEY (`conexion_id`) REFERENCES `canal_conexiones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
-- hoteles.idx_hotel_zona
ALTER TABLE `hoteles` ADD INDEX `idx_hotel_zona` (`zona_id`);

-- hoteles.idx_hotel_estado
ALTER TABLE `hoteles` ADD INDEX `idx_hotel_estado` (`estado`);

-- imagenes.idx_imagen_hotel
ALTER TABLE `imagenes` ADD INDEX `idx_imagen_hotel` (`hotel_id`);

-- imagenes.idx_imagen_tipo
ALTER TABLE `imagenes` ADD INDEX `idx_imagen_tipo` (`tipo_habitacion_id`);

-- favoritos.uq_favorito
ALTER TABLE `favoritos` ADD UNIQUE INDEX `uq_favorito` (`user_id`, `hotel_id`);

-- tipos_habitacion.idx_tipo_habitacion_hotel
ALTER TABLE `tipos_habitacion` ADD INDEX `idx_tipo_habitacion_hotel` (`hotel_id`);

-- tipos_habitacion.uq_tipo_habitacion_hotel_nombre
ALTER TABLE `tipos_habitacion` ADD UNIQUE INDEX `uq_tipo_habitacion_hotel_nombre` (`hotel_id`, `nombre`);

-- habitaciones.habitaciones_hotel_id_numero_habitacion
ALTER TABLE `habitaciones` ADD UNIQUE INDEX `habitaciones_hotel_id_numero_habitacion` (`hotel_id`, `numero_habitacion`);

-- bloqueos_habitaciones.idx_bloqueo_habitacion
ALTER TABLE `bloqueos_habitaciones` ADD INDEX `idx_bloqueo_habitacion` (`habitacion_id`);

-- bloqueos_habitaciones.idx_bloqueo_fechas
ALTER TABLE `bloqueos_habitaciones` ADD INDEX `idx_bloqueo_fechas` (`fecha_inicio`, `fecha_fin`);

-- bloqueos_habitaciones.idx_bloqueo_estado
ALTER TABLE `bloqueos_habitaciones` ADD INDEX `idx_bloqueo_estado` (`estado`);

-- temporadas.idx_temporada_hotel
ALTER TABLE `temporadas` ADD INDEX `idx_temporada_hotel` (`hotel_id`);

-- temporadas.idx_temporada_fechas
ALTER TABLE `temporadas` ADD INDEX `idx_temporada_fechas` (`fecha_inicio`, `fecha_fin`);

-- temporadas.idx_temporada_estado
ALTER TABLE `temporadas` ADD INDEX `idx_temporada_estado` (`estado`);

-- tarifas_habitacion.idx_tarifa_hotel
ALTER TABLE `tarifas_habitacion` ADD INDEX `idx_tarifa_hotel` (`hotel_id`);

-- tarifas_habitacion.idx_tarifa_tipo
ALTER TABLE `tarifas_habitacion` ADD INDEX `idx_tarifa_tipo` (`tipo_habitacion_id`);

-- tarifas_habitacion.idx_tarifa_temporada
ALTER TABLE `tarifas_habitacion` ADD INDEX `idx_tarifa_temporada` (`temporada_id`);

-- tarifas_habitacion.idx_tarifa_estado
ALTER TABLE `tarifas_habitacion` ADD INDEX `idx_tarifa_estado` (`estado`);

-- tarifas_habitacion.uq_tarifa_unica
ALTER TABLE `tarifas_habitacion` ADD UNIQUE INDEX `uq_tarifa_unica` (`hotel_id`, `tipo_habitacion_id`, `temporada_id`, `tipo_dia`);

-- servicios.idx_servicio_hotel
ALTER TABLE `servicios` ADD INDEX `idx_servicio_hotel` (`hotel_id`);

-- servicios.idx_servicio_estado
ALTER TABLE `servicios` ADD INDEX `idx_servicio_estado` (`estado`);

-- servicios.uq_servicio_hotel_nombre
ALTER TABLE `servicios` ADD UNIQUE INDEX `uq_servicio_hotel_nombre` (`hotel_id`, `nombre`);

-- clientes.idx_cliente_email
ALTER TABLE `clientes` ADD INDEX `idx_cliente_email` (`email`);

-- clientes.idx_cliente_documento
ALTER TABLE `clientes` ADD INDEX `idx_cliente_documento` (`documento_identidad`);

-- reservas.idx_reserva_hotel_fechas
ALTER TABLE `reservas` ADD INDEX `idx_reserva_hotel_fechas` (`hotel_id`, `fecha_entrada`, `fecha_salida`);

-- reservas.idx_reserva_cliente
ALTER TABLE `reservas` ADD INDEX `idx_reserva_cliente` (`cliente_id`);

-- reservas.idx_reserva_user
ALTER TABLE `reservas` ADD INDEX `idx_reserva_user` (`user_id`);

-- reservas.idx_reserva_estado
ALTER TABLE `reservas` ADD INDEX `idx_reserva_estado` (`estado`);

-- detalle_reservas.idx_detalle_reserva
ALTER TABLE `detalle_reservas` ADD INDEX `idx_detalle_reserva` (`reserva_id`);

-- detalle_reservas.idx_detalle_habitacion
ALTER TABLE `detalle_reservas` ADD INDEX `idx_detalle_habitacion` (`habitacion_id`);

-- detalle_reservas.uq_detalle_reserva_habitacion
ALTER TABLE `detalle_reservas` ADD UNIQUE INDEX `uq_detalle_reserva_habitacion` (`reserva_id`, `habitacion_id`);

-- reserva_servicios.idx_rs_reserva
ALTER TABLE `reserva_servicios` ADD INDEX `idx_rs_reserva` (`reserva_id`);

-- reserva_servicios.idx_rs_servicio
ALTER TABLE `reserva_servicios` ADD INDEX `idx_rs_servicio` (`servicio_id`);

-- pagos.pagos_reserva_id
ALTER TABLE `pagos` ADD INDEX `pagos_reserva_id` (`reserva_id`);

-- pagos.pagos_estado
ALTER TABLE `pagos` ADD INDEX `pagos_estado` (`estado`);

-- pagos.idx_pago_referencia
ALTER TABLE `pagos` ADD INDEX `idx_pago_referencia` (`referencia`);

-- valoraciones.uq_valoracion_reserva
ALTER TABLE `valoraciones` ADD UNIQUE INDEX `uq_valoracion_reserva` (`reserva_id`);

-- valoraciones.idx_valoracion_hotel
ALTER TABLE `valoraciones` ADD INDEX `idx_valoracion_hotel` (`hotel_id`);

-- configuraciones.configuraciones_hotel_id_clave
ALTER TABLE `configuraciones` ADD UNIQUE INDEX `configuraciones_hotel_id_clave` (`hotel_id`, `clave`);

-- audit_logs.idx_audit_action
ALTER TABLE `audit_logs` ADD INDEX `idx_audit_action` (`action`);

-- audit_logs.idx_audit_user_id
ALTER TABLE `audit_logs` ADD INDEX `idx_audit_user_id` (`user_id`);

-- audit_logs.idx_audit_created_at
ALTER TABLE `audit_logs` ADD INDEX `idx_audit_created_at` (`created_at`);

-- audit_logs.idx_audit_target
ALTER TABLE `audit_logs` ADD INDEX `idx_audit_target` (`target_type`, `target_id`);

-- canal_conexiones.uq_canal_hotel_proveedor
ALTER TABLE `canal_conexiones` ADD UNIQUE INDEX `uq_canal_hotel_proveedor` (`hotel_id`, `proveedor`);

-- canal_mapeos.uq_mapeo_tipo
ALTER TABLE `canal_mapeos` ADD UNIQUE INDEX `uq_mapeo_tipo` (`conexion_id`, `tipo_habitacion_id`);

-- canal_mapeos.uq_mapeo_codigo
ALTER TABLE `canal_mapeos` ADD UNIQUE INDEX `uq_mapeo_codigo` (`conexion_id`, `codigo_habitacion`);

-- canal_inventario.uq_canal_inv
ALTER TABLE `canal_inventario` ADD UNIQUE INDEX `uq_canal_inv` (`tipo_habitacion_id`, `fecha`);

-- canal_inventario.idx_canal_inv_hotel_fecha
ALTER TABLE `canal_inventario` ADD INDEX `idx_canal_inv_hotel_fecha` (`hotel_id`, `fecha`);

-- canal_mensajes.idx_canal_msg_hotel
ALTER TABLE `canal_mensajes` ADD INDEX `idx_canal_msg_hotel` (`hotel_id`, `created_at`);

-- canal_salidas.idx_canal_salida_cola
ALTER TABLE `canal_salidas` ADD INDEX `idx_canal_salida_cola` (`estado`, `proximo_intento`);

-- canal_salidas.idx_canal_salida_reserva
ALTER TABLE `canal_salidas` ADD INDEX `idx_canal_salida_reserva` (`reserva_id`);

SET FOREIGN_KEY_CHECKS = 1;
