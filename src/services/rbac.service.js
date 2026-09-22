const { models } = require('../models');
const { PERMISOS, ROLES, ROL_PERMISOS, MENU } = require('../../scripts/rbac-data');

/*
| Roles, permisos y menú viven en la base de datos. Este servicio:
|   - sincroniza los datos base (solo AGREGA lo que falta),
|   - resuelve permisos por rol con una caché corta (los cambios hechos desde el panel
|     invalidan la caché al instante; en varios servidores expira sola en CACHE_MS),
|   - arma el menú lateral de cada usuario.
*/

const CACHE_MS = 30 * 1000;
let cache = null; // { hasta, roles: Map<clave, {id, alcance, es_sistema, asignable_por_hotel, permisos:Set}> }

function invalidar() {
  cache = null;
}

async function cargar() {
  if (cache && cache.hasta > Date.now()) return cache;

  const roles = await models.Rol.findAll({
    include: [{ model: models.Permiso, as: 'permisos', attributes: ['clave'], through: { attributes: [] } }],
  });
  const mapa = new Map();
  for (const r of roles) {
    mapa.set(r.clave, {
      id: r.id,
      clave: r.clave,
      nombre: r.nombre,
      alcance: r.alcance,
      es_sistema: r.es_sistema,
      asignable_por_hotel: r.asignable_por_hotel,
      permisos: new Set(r.permisos.map((p) => p.clave)),
    });
  }
  cache = { hasta: Date.now() + CACHE_MS, roles: mapa };
  return cache;
}

// Un rol desconocido (borrado o mal escrito) se trata como huésped sin permisos: falla cerrado.
const SIN_ROL = { alcance: 'cliente', permisos: new Set(), es_sistema: false, asignable_por_hotel: false };

async function infoRol(clave) {
  const { roles } = await cargar();
  return roles.get(clave) || SIN_ROL;
}

/** Datos de acceso de un usuario: alcance y lista de permisos efectivos. */
async function accesoDe(rolClave) {
  const rol = await infoRol(rolClave);
  return { alcance: rol.alcance, permisos: rol.permisos };
}

async function sincronizar() {
  // Permisos
  const permisoPorClave = new Map();
  const permisosNuevos = new Set();
  for (const [clave, modulo, descripcion] of PERMISOS) {
    const [p, creado] = await models.Permiso.findOrCreate({ where: { clave }, defaults: { modulo, descripcion } });
    permisoPorClave.set(clave, p);
    if (creado) permisosNuevos.add(clave);
  }

  // Roles
  const rolPorClave = new Map();
  const nuevos = new Set();
  for (const [clave, nombre, descripcion, alcance, es_sistema, asignable_por_hotel] of ROLES) {
    const [r, creado] = await models.Rol.findOrCreate({
      where: { clave },
      defaults: { nombre, descripcion, alcance, es_sistema, asignable_por_hotel },
    });
    rolPorClave.set(clave, r);
    if (creado) nuevos.add(clave);
  }

  // Permisos por rol: los roles NUEVOS reciben los de fábrica. En roles existentes solo se
  // agregan permisos NUEVOS del sistema (no se restauran los que la plataforma quitó a propósito).
  const existentes = await models.RolPermiso.findAll({ raw: true });
  const yaTiene = new Set(existentes.map((x) => `${x.rol_id}:${x.permiso_id}`));
  const todos = PERMISOS.map((p) => p[0]);

  for (const [clave, rol] of rolPorClave) {
    const deseados = clave === 'super_admin' ? todos : ROL_PERMISOS[clave] || [];
    for (const pc of deseados) {
      const permiso = permisoPorClave.get(pc);
      const esNuevoRol = nuevos.has(clave);
      const permisoRecien = permisosNuevos.has(pc);
      if (!yaTiene.has(`${rol.id}:${permiso.id}`) && (esNuevoRol || permisoRecien || clave === 'super_admin')) {
        await models.RolPermiso.create({ rol_id: rol.id, permiso_id: permiso.id });
      }
    }
  }

  // Menú
  for (const [clave, texto, icono, ruta, seccion, orden, permiso] of MENU) {
    await models.MenuItem.findOrCreate({
      where: { clave },
      defaults: { texto, icono, ruta, seccion, orden, permiso_id: permiso ? permisoPorClave.get(permiso).id : null },
    });
  }

  invalidar();
}

/** Menú lateral del usuario, agrupado por sección y ordenado. */
async function menuPara(rolClave) {
  const { alcance, permisos } = await accesoDe(rolClave);
  if (alcance === 'cliente') return [];

  const items = await models.MenuItem.findAll({
    where: { activo: true },
    include: [{ model: models.Permiso, as: 'permiso', attributes: ['clave'] }],
    order: [['orden', 'ASC'], ['id', 'ASC']],
  });

  return items
    .filter((i) => {
      if (!i.permiso) return true;
      if (alcance === 'plataforma') return true;
      return permisos.has(i.permiso.clave);
    })
    // Las opciones de plataforma jamás se muestran a personal de un hotel, aunque el permiso se asignara por error.
    .filter((i) => alcance === 'plataforma' || !i.permiso?.clave.startsWith('plataforma.'))
    .map((i) => ({ clave: i.clave, texto: i.texto, icono: i.icono, ruta: i.ruta, seccion: i.seccion, permiso: i.permiso?.clave ?? null }));
}

async function rolesAsignablesPorHotel() {
  const { roles } = await cargar();
  return [...roles.values()].filter((r) => r.alcance === 'hotel' && r.asignable_por_hotel).map(({ clave, nombre }) => ({ clave, nombre }));
}

async function rolesDeHotel() {
  const { roles } = await cargar();
  return [...roles.values()].filter((r) => r.alcance === 'hotel').map(({ clave, nombre, asignable_por_hotel }) => ({ clave, nombre, asignable_por_hotel }));
}

// Los permisos de plataforma solo pueden tenerlos roles con alcance "plataforma".
const esPermisoDePlataforma = (clave) => clave.startsWith('plataforma.');

module.exports = {
  sincronizar,
  invalidar,
  accesoDe,
  infoRol,
  menuPara,
  rolesAsignablesPorHotel,
  rolesDeHotel,
  esPermisoDePlataforma,
};
