/*
| Migrador ADITIVO e idempotente.
|
| Lleva una base de datos existente (la del sistema de un solo hotel) al esquema del marketplace
| sin borrar ni reescribir datos:
|   - crea las tablas que faltan,
|   - agrega las columnas que faltan (si son NOT NULL sin default, se crean nulables),
|   - amplía los ENUM de MySQL con los valores nuevos,
|   - crea los índices que faltan y quita el UNIQUE global de clientes.documento_identidad,
|   - rellena hoteles.slug donde falte,
|   - convierte users.rol de ENUM a texto y siembra roles, permisos y menú (RBAC).
| No elimina columnas ni tablas. Es seguro ejecutarlo varias veces.
|
| Uso: npm run db:migrate
*/
require('dotenv').config();

const { sequelize, closeConnection } = require('../src/config/db');
const { models, applyAssociations } = require('../src/models');
const { slugUnico } = require('../src/services/hoteles.service');
const rbac = require('../src/services/rbac.service');

const log = (...a) => console.log('[migrate]', ...a);
const nombreTabla = (t) => (typeof t === 'string' ? t : t.tableName);

function valoresEnum(descripcionColumna) {
  const m = /^ENUM\((.*)\)$/i.exec(String(descripcionColumna.type));
  if (!m) return null;
  return m[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
}

async function migrar() {
  applyAssociations();
  const qi = sequelize.getQueryInterface();
  const esMysql = sequelize.getDialect() === 'mysql';

  const existentes = new Set((await qi.showAllTables()).map(nombreTabla));

  for (const model of Object.values(models)) {
    const tabla = model.getTableName();

    if (!existentes.has(tabla)) {
      await model.sync();
      log(`tabla creada: ${tabla}`);
      continue;
    }

    const columnas = await qi.describeTable(tabla);

    for (const [atributo, def] of Object.entries(model.rawAttributes)) {
      const campo = def.field || atributo;
      if (def.primaryKey) continue;

      if (!columnas[campo]) {
        const nulable = def.allowNull !== false || def.defaultValue === undefined;
        await qi.addColumn(tabla, campo, {
          type: def.type,
          allowNull: nulable ? true : false,
          defaultValue: def.defaultValue,
        });
        log(`columna agregada: ${tabla}.${campo}${def.allowNull === false && nulable ? ' (nulable: sin default)' : ''}`);
        continue;
      }

      // Columna que era ENUM y ahora es texto (users.rol: los roles viven en la tabla roles).
      if (esMysql && def.type.key === 'STRING' && /^ENUM/i.test(String(columnas[campo].type))) {
        await qi.changeColumn(tabla, campo, { type: def.type, allowNull: def.allowNull !== false, defaultValue: def.defaultValue });
        log(`columna convertida de ENUM a texto: ${tabla}.${campo}`);
      }

      // ENUM ampliado en el modelo (p. ej. hoteles.estado += 'pendiente')
      if (esMysql && def.type.key === 'ENUM') {
        const actuales = valoresEnum(columnas[campo]);
        const deseados = def.values;
        if (actuales && deseados.some((v) => !actuales.includes(v))) {
          const unidos = [...new Set([...actuales, ...deseados])];
          await qi.changeColumn(tabla, campo, {
            type: new (require('sequelize').DataTypes.ENUM)(...unidos),
            allowNull: def.allowNull !== false,
            defaultValue: def.defaultValue,
          });
          log(`enum ampliado: ${tabla}.${campo} → ${unidos.join(', ')}`);
        }
      }
    }

    // Índices declarados en el modelo que aún no existen.
    const indices = await qi.showIndex(tabla);
    const nombres = new Set(indices.map((i) => i.name));
    for (const idx of model.options.indexes || []) {
      if (!idx.name || nombres.has(idx.name)) continue;
      try {
        await qi.addIndex(tabla, idx.fields, { name: idx.name, unique: Boolean(idx.unique) });
        log(`índice creado: ${idx.name}`);
      } catch (e) {
        log(`no se pudo crear el índice ${idx.name} (datos existentes lo violan?): ${e.message}`);
      }
    }
  }

  // clientes.documento_identidad ya no es único global.
  if (existentes.has('clientes')) {
    const idxs = await qi.showIndex('clientes');
    for (const i of idxs) {
      const campos = (i.fields || []).map((f) => f.attribute);
      if (i.unique && campos.length === 1 && campos[0] === 'documento_identidad') {
        try {
          await qi.removeIndex('clientes', i.name);
          log(`índice único eliminado: clientes.${i.name}`);
        } catch (e) {
          // SQLite no permite quitar un UNIQUE de columna; en MySQL sí.
          log(`no se pudo quitar el UNIQUE de clientes.documento_identidad: ${e.message}`);
        }
      }
    }
  }

  // Slugs de hoteles existentes.
  const sinSlug = await models.Hotel.findAll({ where: { slug: null } });
  for (const hotel of sinSlug) {
    await hotel.update({ slug: await slugUnico(hotel.nombre, hotel.id) });
    log(`slug asignado: ${hotel.nombre} → ${hotel.slug}`);
  }

  // addColumn no agrega el UNIQUE de un atributo `unique: true`: lo aseguramos para el slug.
  const idxHoteles = await qi.showIndex('hoteles');
  const slugUnicoIdx = idxHoteles.some(
    (i) => i.unique && (i.fields || []).length === 1 && (i.fields[0].attribute === 'slug')
  );
  if (!slugUnicoIdx) {
    try {
      await qi.addIndex('hoteles', ['slug'], { name: 'uq_hotel_slug', unique: true });
      log('índice único creado: hoteles.slug');
    } catch (e) {
      log(`no se pudo crear el UNIQUE de hoteles.slug: ${e.message}`);
    }
  }

  // Roles, permisos y menú lateral (solo agrega lo que falta; respeta lo personalizado).
  await rbac.sincronizar();
  log('roles, permisos y menú sincronizados');

  log('listo');
}

migrar()
  .catch((e) => {
    console.error('[migrate] ERROR:', e);
    process.exitCode = 1;
  })
  .finally(closeConnection);
