/*
| Genera database/schema_mariadb.sql: el CREATE TABLE de cada modelo, tal cual lo generaría
| Sequelize al sincronizar (mismo motor que usan `npm run db:migrate` y `npm run db:seed`),
| pero sin necesitar una base de datos conectada: se le pide al QueryGenerator el texto SQL
| y no se ejecuta nada.
|
|   npm run db:schema:sql
|
| Es un script de instalación, no de migración: usa CREATE TABLE IF NOT EXISTS, así que es
| seguro volver a correrlo, pero no altera tablas que ya existan con otra forma (para eso está
| `npm run db:migrate`).
*/
process.env.DB_DIALECT = 'mysql';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'schema_export'; // no se usa: nunca se abre conexión
process.env.DB_USER = 'export';
process.env.DB_PASSWORD = 'export';

const fs = require('fs');
const path = require('path');
const { sequelize, models, applyAssociations } = require('../src/models');

applyAssociations();

const qi = sequelize.getQueryInterface();
const qg = qi.queryGenerator;

// Orden estable y legible (no afecta la validez: las FK van con SET FOREIGN_KEY_CHECKS=0,
// igual que hace mysqldump, así que no importa qué tabla se crea antes).
const ORDEN = [
  'Zona', 'Amenidad', 'Permiso', 'Rol', 'RolPermiso', 'MenuItem',
  'Hotel', 'HotelAmenidad', 'Imagen', 'Favorito',
  'TipoHabitacion', 'TipoHabitacionAmenidad', 'Habitacion', 'BloqueoHabitacion',
  'Temporada', 'TarifaHabitacion', 'Servicio',
  'User', 'Cliente', 'Reserva', 'DetalleReserva', 'ServicioReserva', 'Pago', 'Valoracion',
  'Configuracion', 'AuditLog',
  'CanalConexion', 'CanalMapeo', 'CanalInventario', 'CanalMensaje', 'CanalSalida',
];
const nombresModelo = Object.keys(models);
for (const n of nombresModelo) if (!ORDEN.includes(n)) ORDEN.push(n); // por si se agrega un modelo y se olvida aquí

function crearTablaSQL(model) {
  const tableName = model.getTableName();
  const atributos = Object.fromEntries(
    Object.entries(model.tableAttributes).map(([k, attr]) => [k, sequelize.normalizeAttribute(attr)])
  );
  const atributosSQL = qg.attributesToSQL(atributos, { table: tableName, context: 'createTable' });
  let sql = qg.createTableQuery(tableName, atributosSQL, {});
  // Idempotente: instalar sobre una base ya creada no debe fallar ni borrar nada.
  sql = sql.replace(/^CREATE TABLE (IF NOT EXISTS )?/i, 'CREATE TABLE IF NOT EXISTS ');
  return sql.trim().replace(/;?$/, ';');
}

function indicesSQL(model) {
  const tableName = model.getTableName();
  return (model.options.indexes || [])
    .filter((idx) => idx.name) // los índices sin nombre son anónimos e imposibles de comprobar antes de crear
    .map((idx) => {
      const sql = qg.addIndexQuery(tableName, { fields: idx.fields, unique: Boolean(idx.unique), name: idx.name }, tableName);
      return { nombre: idx.name, tabla: tableName, sql: sql.trim().replace(/;?$/, ';') };
    });
}

const tablas = ORDEN.map((n) => models[n]).filter(Boolean).map((m) => `-- ${m.getTableName()}\n${crearTablaSQL(m)}`);
const indices = ORDEN.map((n) => models[n]).filter(Boolean).flatMap(indicesSQL);

const cabecera = `-- =====================================================================
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

`;

const pie = `
SET FOREIGN_KEY_CHECKS = 1;
`;

const bloqueIndices = indices.length
  ? `\n-- ---------------------------------------------------------------------\n-- Índices\n-- ---------------------------------------------------------------------\n` +
    indices.map((i) => `-- ${i.tabla}.${i.nombre}\n${i.sql}`).join('\n\n') +
    '\n'
  : '';

const destino = path.join(__dirname, '..', 'database', 'schema_mariadb.sql');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, cabecera + tablas.join('\n\n') + '\n' + bloqueIndices + pie);
console.log(`Generado ${destino} (${tablas.length} tablas, ${indices.length} índices)`);
