/*
| Genera database/rbac_mariadb.sql: tablas, datos base y menú lateral (RBAC) para MariaDB/MySQL,
| a partir de scripts/rbac-data.js (misma fuente que usa la aplicación).
|   npm run db:sql
*/
const fs = require('fs');
const path = require('path');
const { PERMISOS, ROLES, ROL_PERMISOS, MENU } = require('./rbac-data');

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 1 : 0);

const todos = PERMISOS.map((p) => p[0]);
const pares = [];
for (const [clave] of ROLES) {
  const lista = clave === 'super_admin' ? todos : ROL_PERMISOS[clave] || [];
  for (const p of lista) pares.push(`(${q(clave)}, ${q(p)})`);
}

const CABECERA = `-- =====================================================================
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
`;

const permisos = `
-- ---------------------------------------------------------------------
-- 3. PERMISOS
-- ---------------------------------------------------------------------
INSERT IGNORE INTO permisos (clave, modulo, descripcion, created_at, updated_at) VALUES
${PERMISOS.map(([c, m, d]) => `  (${q(c)}, ${q(m)}, ${q(d)}, NOW(), NOW())`).join(',\n')};
`;

const roles = `
-- ---------------------------------------------------------------------
-- 4. ROLES
-- ---------------------------------------------------------------------
INSERT IGNORE INTO roles (clave, nombre, descripcion, alcance, es_sistema, asignable_por_hotel, created_at, updated_at) VALUES
${ROLES.map(([c, n, d, a, s, h]) => `  (${q(c)}, ${q(n)}, ${q(d)}, ${q(a)}, ${b(s)}, ${b(h)}, NOW(), NOW())`).join(',\n')};

-- ---------------------------------------------------------------------
-- 5. PERMISOS POR ROL (valores de fábrica; solo instalación inicial)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p
WHERE (r.clave, p.clave) IN (
  ${pares.join(',\n  ')}
);
`;

const menu = `
-- ---------------------------------------------------------------------
-- 6. MENÚ LATERAL
-- ---------------------------------------------------------------------
INSERT IGNORE INTO menu_items (clave, texto, icono, ruta, seccion, orden, permiso_id, activo, created_at, updated_at)
SELECT m.clave, m.texto, m.icono, m.ruta, m.seccion, m.orden, p.id, 1, NOW(), NOW()
FROM (
${MENU.map(
  ([c, t, i, r, s, o, p], idx) =>
    `  ${idx ? 'UNION ALL ' : ''}SELECT ${q(c)} AS clave, ${q(t)} AS texto, ${q(i)} AS icono, ${q(r)} AS ruta, ${q(s)} AS seccion, ${o} AS orden, ${q(p)} AS permiso`
).join('\n')}
) m
LEFT JOIN permisos p ON p.clave = m.permiso;
`;

const consultas = `
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
`;

const destino = path.join(__dirname, '..', 'database', 'rbac_mariadb.sql');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, CABECERA + permisos + roles + menu + consultas);
console.log(`Generado ${destino}`);
