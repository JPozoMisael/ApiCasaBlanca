-- =====================================================================
-- Salinas Booking · Roles, permisos y menú lateral (RBAC) · MariaDB / MySQL
-- GENERADO por "npm run db:sql" desde scripts/rbac-data.js. No lo edites a mano.
--
-- Uso (base ya migrada con "npm run db:migrate" o creada con el esquema de la app):
--   mariadb -u USUARIO -p NOMBRE_BD < database/rbac_mariadb.sql
--
-- Es seguro repetirlo para las tablas, roles, permisos y menú (usa IF NOT EXISTS / INSERT IGNORE).
-- OJO: la sección 5 (PERMISOS POR ROL) restaura los permisos de fábrica; ejecútala solo en la
-- instalación inicial, o tus cambios hechos desde el panel "Roles y permisos" se perderían.
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id                  INT NOT NULL AUTO_INCREMENT,
  clave               VARCHAR(30)  NOT NULL,
  nombre              VARCHAR(60)  NOT NULL,
  descripcion         VARCHAR(255) NULL,
  alcance             ENUM('plataforma','hotel','cliente') NOT NULL DEFAULT 'hotel',
  es_sistema          TINYINT(1)   NOT NULL DEFAULT 0,
  asignable_por_hotel TINYINT(1)   NOT NULL DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permisos (
  id          INT NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(60)  NOT NULL,
  modulo      VARCHAR(40)  NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permisos_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id     INT NOT NULL,
  permiso_id INT NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  KEY idx_rol_permisos_permiso (permiso_id),
  CONSTRAINT fk_rp_rol     FOREIGN KEY (rol_id)     REFERENCES roles (id)    ON DELETE CASCADE,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
  id         INT NOT NULL AUTO_INCREMENT,
  clave      VARCHAR(40)  NOT NULL,
  texto      VARCHAR(60)  NOT NULL,
  icono      VARCHAR(40)  NULL,
  ruta       VARCHAR(120) NOT NULL,
  seccion    VARCHAR(40)  NOT NULL DEFAULT 'Gestión',
  orden      INT          NOT NULL DEFAULT 0,
  permiso_id INT          NULL,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_clave (clave),
  KEY idx_menu_permiso (permiso_id),
  CONSTRAINT fk_menu_permiso FOREIGN KEY (permiso_id) REFERENCES permisos (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. users.rol deja de ser ENUM: ahora es la clave de un rol (permite crear roles sin tocar el esquema)
-- ---------------------------------------------------------------------
ALTER TABLE users MODIFY rol VARCHAR(30) NOT NULL DEFAULT 'cliente';

-- ---------------------------------------------------------------------
-- 3. PERMISOS
-- ---------------------------------------------------------------------
INSERT IGNORE INTO permisos (clave, modulo, descripcion, created_at, updated_at) VALUES
  ('dashboard.ver', 'Resumen', 'Ver el resumen del día (llegadas, salidas, ocupación)', NOW(), NOW()),
  ('reservas.ver', 'Reservas', 'Ver reservas, huéspedes y detalle', NOW(), NOW()),
  ('calendario.ver', 'Reservas', 'Ver el calendario de ocupación por habitación', NOW(), NOW()),
  ('reservas.gestionar', 'Reservas', 'Crear, confirmar, cancelar y registrar check-in / check-out', NOW(), NOW()),
  ('pagos.ver', 'Pagos', 'Ver los cobros registrados', NOW(), NOW()),
  ('pagos.registrar', 'Pagos', 'Registrar cobros de una reserva', NOW(), NOW()),
  ('huespedes.ver', 'Huéspedes', 'Ver el listado de huéspedes', NOW(), NOW()),
  ('habitaciones.ver', 'Habitaciones', 'Ver tipos de habitación y habitaciones', NOW(), NOW()),
  ('habitaciones.estado', 'Habitaciones', 'Cambiar el estado de una habitación (limpieza, ocupada…)', NOW(), NOW()),
  ('habitaciones.gestionar', 'Habitaciones', 'Crear, editar y eliminar tipos de habitación y habitaciones', NOW(), NOW()),
  ('bloqueos.gestionar', 'Habitaciones', 'Bloquear habitaciones por mantenimiento', NOW(), NOW()),
  ('tarifas.gestionar', 'Precios', 'Administrar temporadas y tarifas', NOW(), NOW()),
  ('servicios.gestionar', 'Precios', 'Administrar servicios extra', NOW(), NOW()),
  ('hotel.editar', 'Alojamiento', 'Editar la ficha pública, fotos y servicios del alojamiento', NOW(), NOW()),
  ('resenas.gestionar', 'Alojamiento', 'Ver y responder las opiniones de huéspedes', NOW(), NOW()),
  ('canales.gestionar', 'Alojamiento', 'Conectar y administrar el channel manager (SiteMinder / Little Hotelier)', NOW(), NOW()),
  ('personal.gestionar', 'Personal', 'Crear y activar/desactivar personal del alojamiento', NOW(), NOW()),
  ('reportes.ver', 'Reportes', 'Ver reportes de ocupación e ingresos', NOW(), NOW()),
  ('plataforma.gestionar', 'Plataforma', 'Registrar alojamientos, roles, permisos y menú (solo plataforma)', NOW(), NOW());

-- ---------------------------------------------------------------------
-- 4. ROLES
-- ---------------------------------------------------------------------
INSERT IGNORE INTO roles (clave, nombre, descripcion, alcance, es_sistema, asignable_por_hotel, created_at, updated_at) VALUES
  ('super_admin', 'Plataforma', 'Equipo de la plataforma: todos los alojamientos y toda la configuración', 'plataforma', 1, 0, NOW(), NOW()),
  ('admin', 'Administrador', 'Dueño o gerente de un alojamiento', 'hotel', 1, 0, NOW(), NOW()),
  ('recepcion', 'Recepción', 'Reservas, check-in/out y cobros', 'hotel', 1, 1, NOW(), NOW()),
  ('limpieza', 'Limpieza / mantenimiento', 'Estado de las habitaciones', 'hotel', 0, 1, NOW(), NOW()),
  ('contabilidad', 'Contabilidad', 'Consulta de reservas, cobros y reportes (solo lectura)', 'hotel', 0, 1, NOW(), NOW()),
  ('cliente', 'Huésped', 'Cuenta de huésped: sus reservas, opiniones y favoritos', 'cliente', 1, 0, NOW(), NOW());

-- ---------------------------------------------------------------------
-- 5. PERMISOS POR ROL (valores de fábrica; solo instalación inicial)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p
WHERE (r.clave, p.clave) IN (
  ('super_admin', 'dashboard.ver'),
  ('super_admin', 'reservas.ver'),
  ('super_admin', 'calendario.ver'),
  ('super_admin', 'reservas.gestionar'),
  ('super_admin', 'pagos.ver'),
  ('super_admin', 'pagos.registrar'),
  ('super_admin', 'huespedes.ver'),
  ('super_admin', 'habitaciones.ver'),
  ('super_admin', 'habitaciones.estado'),
  ('super_admin', 'habitaciones.gestionar'),
  ('super_admin', 'bloqueos.gestionar'),
  ('super_admin', 'tarifas.gestionar'),
  ('super_admin', 'servicios.gestionar'),
  ('super_admin', 'hotel.editar'),
  ('super_admin', 'resenas.gestionar'),
  ('super_admin', 'canales.gestionar'),
  ('super_admin', 'personal.gestionar'),
  ('super_admin', 'reportes.ver'),
  ('super_admin', 'plataforma.gestionar'),
  ('admin', 'dashboard.ver'),
  ('admin', 'reservas.ver'),
  ('admin', 'calendario.ver'),
  ('admin', 'reservas.gestionar'),
  ('admin', 'pagos.ver'),
  ('admin', 'pagos.registrar'),
  ('admin', 'huespedes.ver'),
  ('admin', 'habitaciones.ver'),
  ('admin', 'habitaciones.estado'),
  ('admin', 'habitaciones.gestionar'),
  ('admin', 'bloqueos.gestionar'),
  ('admin', 'tarifas.gestionar'),
  ('admin', 'servicios.gestionar'),
  ('admin', 'hotel.editar'),
  ('admin', 'resenas.gestionar'),
  ('admin', 'canales.gestionar'),
  ('admin', 'personal.gestionar'),
  ('admin', 'reportes.ver'),
  ('recepcion', 'dashboard.ver'),
  ('recepcion', 'calendario.ver'),
  ('recepcion', 'reservas.ver'),
  ('recepcion', 'reservas.gestionar'),
  ('recepcion', 'pagos.ver'),
  ('recepcion', 'pagos.registrar'),
  ('recepcion', 'huespedes.ver'),
  ('recepcion', 'habitaciones.ver'),
  ('recepcion', 'habitaciones.estado'),
  ('recepcion', 'bloqueos.gestionar'),
  ('limpieza', 'habitaciones.ver'),
  ('limpieza', 'habitaciones.estado'),
  ('contabilidad', 'dashboard.ver'),
  ('contabilidad', 'reservas.ver'),
  ('contabilidad', 'pagos.ver'),
  ('contabilidad', 'reportes.ver')
);

-- ---------------------------------------------------------------------
-- 6. MENÚ LATERAL
-- ---------------------------------------------------------------------
INSERT IGNORE INTO menu_items (clave, texto, icono, ruta, seccion, orden, permiso_id, activo, created_at, updated_at)
SELECT m.clave, m.texto, m.icono, m.ruta, m.seccion, m.orden, p.id, 1, NOW(), NOW()
FROM (
  SELECT 'resumen' AS clave, 'Resumen' AS texto, 'grid-outline' AS icono, '/admin/dashboard' AS ruta, 'Operación' AS seccion, 10 AS orden, 'dashboard.ver' AS permiso
  UNION ALL SELECT 'calendario' AS clave, 'Calendario' AS texto, 'calendar-outline' AS icono, '/admin/calendario' AS ruta, 'Operación' AS seccion, 15 AS orden, 'calendario.ver' AS permiso
  UNION ALL SELECT 'reservas' AS clave, 'Reservas' AS texto, 'clipboard-outline' AS icono, '/admin/reservas' AS ruta, 'Operación' AS seccion, 20 AS orden, 'reservas.ver' AS permiso
  UNION ALL SELECT 'nueva-reserva' AS clave, 'Nueva reserva' AS texto, 'add-circle-outline' AS icono, '/admin/nueva-reserva' AS ruta, 'Operación' AS seccion, 25 AS orden, 'reservas.gestionar' AS permiso
  UNION ALL SELECT 'habitaciones' AS clave, 'Habitaciones' AS texto, 'bed-outline' AS icono, '/admin/habitaciones' AS ruta, 'Operación' AS seccion, 30 AS orden, 'habitaciones.ver' AS permiso
  UNION ALL SELECT 'tarifas' AS clave, 'Tarifas y temporadas' AS texto, 'pricetag-outline' AS icono, '/admin/tarifas' AS ruta, 'Precios' AS seccion, 40 AS orden, 'tarifas.gestionar' AS permiso
  UNION ALL SELECT 'servicios' AS clave, 'Servicios extra' AS texto, 'restaurant-outline' AS icono, '/admin/servicios' AS ruta, 'Precios' AS seccion, 50 AS orden, 'servicios.gestionar' AS permiso
  UNION ALL SELECT 'personal' AS clave, 'Personal' AS texto, 'people-outline' AS icono, '/admin/usuarios' AS ruta, 'Alojamiento' AS seccion, 60 AS orden, 'personal.gestionar' AS permiso
  UNION ALL SELECT 'mi-hotel' AS clave, 'Mi alojamiento' AS texto, 'storefront-outline' AS icono, '/admin/mi-hotel' AS ruta, 'Alojamiento' AS seccion, 70 AS orden, 'hotel.editar' AS permiso
  UNION ALL SELECT 'canales' AS clave, 'Canales de venta' AS texto, 'sync-outline' AS icono, '/admin/canales' AS ruta, 'Alojamiento' AS seccion, 75 AS orden, 'canales.gestionar' AS permiso
  UNION ALL SELECT 'hoteles' AS clave, 'Alojamientos' AS texto, 'globe-outline' AS icono, '/admin/hoteles' AS ruta, 'Plataforma' AS seccion, 80 AS orden, 'plataforma.gestionar' AS permiso
  UNION ALL SELECT 'roles' AS clave, 'Roles y permisos' AS texto, 'shield-checkmark-outline' AS icono, '/admin/roles' AS ruta, 'Plataforma' AS seccion, 90 AS orden, 'plataforma.gestionar' AS permiso
) m
LEFT JOIN permisos p ON p.clave = m.permiso;

-- ---------------------------------------------------------------------
-- 7. CONSULTAS ÚTILES
-- ---------------------------------------------------------------------
-- Permisos de cada rol:
--   SELECT r.clave AS rol, GROUP_CONCAT(p.clave ORDER BY p.clave) AS permisos
--   FROM roles r LEFT JOIN rol_permisos rp ON rp.rol_id = r.id LEFT JOIN permisos p ON p.id = rp.permiso_id
--   GROUP BY r.id;
-- Menú que ve un rol (ejemplo: recepcion):
--   SELECT m.texto, m.ruta FROM menu_items m
--   LEFT JOIN permisos p ON p.id = m.permiso_id
--   LEFT JOIN rol_permisos rp ON rp.permiso_id = p.id
--   LEFT JOIN roles r ON r.id = rp.rol_id AND r.clave = 'recepcion'
--   WHERE m.activo = 1 AND (m.permiso_id IS NULL OR r.id IS NOT NULL) ORDER BY m.orden;
-- Usuarios con un rol que ya no existe (quedan sin acceso):
--   SELECT u.id, u.email, u.rol FROM users u LEFT JOIN roles r ON r.clave = u.rol WHERE r.id IS NULL;
