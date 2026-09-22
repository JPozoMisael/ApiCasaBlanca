const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const { permiso } = require('../middleware/roles.middleware');
const rbac = require('../services/rbac.service');
const S = require('../validators/schemas');
const { models } = require('../models');
const { sequelize } = require('../config/db');
const { AppError } = require('../utils/errors');
const { slugify } = require('../utils/codes');
const hoteles = require('../services/hoteles.service');
const reportes = require('../services/reportes.service');
const valoraciones = require('../services/valoraciones.service');

// Administración de la plataforma: solo super_admin.
const router = express.Router();
router.use(auth, permiso('plataforma.gestionar'));

router.get(
  '/stats',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await reportes.plataforma() }))
);

/* ---------- Hoteles ---------- */
router.get(
  '/hotels',
  asyncHandler(async (req, res) => res.json({ ok: true, ...(await hoteles.listarParaPlataforma(req.query)) }))
);

// Alta de un alojamiento con su administrador.
router.post(
  '/hotels',
  validate(S.crearHotel),
  asyncHandler(async (req, res) => {
    const r = await hoteles.crearHotel(req.body.hotel, req.body.propietario, req.user);
    res.status(201).json({ ok: true, message: 'Alojamiento registrado', data: r });
  })
);

router.put(
  '/hotels/:id',
  validate(S.actualizarHotel),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await hoteles.actualizarHotel(req.params.id, req.body, req.user) });
  })
);

// Los hoteles no se borran (arrastrarían reservas y pagos): se inactivan.
router.patch(
  '/hotels/:id/estado',
  asyncHandler(async (req, res) => {
    const { estado } = req.body;
    if (!['activo', 'inactivo', 'pendiente'].includes(estado)) throw new AppError('Estado inválido', 400);
    res.json({ ok: true, data: await hoteles.actualizarHotel(req.params.id, { estado }, req.user) });
  })
);

/* ---------- Zonas ---------- */
router.get(
  '/zonas',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await models.Zona.findAll({ order: [['orden', 'ASC']] }) }))
);

router.post(
  '/zonas',
  validate(S.crearZona),
  asyncHandler(async (req, res) => {
    const zona = await models.Zona.create({ ...req.body, slug: slugify(req.body.nombre) });
    res.status(201).json({ ok: true, data: zona });
  })
);

router.put(
  '/zonas/:id',
  validate(S.actualizarZona),
  asyncHandler(async (req, res) => {
    const zona = await models.Zona.findByPk(req.params.id);
    if (!zona) throw new AppError('Zona no encontrada', 404);
    await zona.update(req.body);
    res.json({ ok: true, data: zona });
  })
);

/* ---------- Moderación de reseñas ---------- */
router.patch(
  '/reviews/:id',
  asyncHandler(async (req, res) => {
    const estado = req.body.estado === 'oculta' ? 'oculta' : 'publicada';
    res.json({ ok: true, data: await valoraciones.moderar(req.params.id, estado, req.user) });
  })
);

/* ---------- Roles, permisos y menú ---------- */
router.get(
  '/permisos',
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await models.Permiso.findAll({ order: [['modulo', 'ASC'], ['clave', 'ASC']] }) });
  })
);

router.get(
  '/roles',
  asyncHandler(async (req, res) => {
    const roles = await models.Rol.findAll({
      include: [{ model: models.Permiso, as: 'permisos', attributes: ['clave'], through: { attributes: [] } }],
      order: [['id', 'ASC']],
    });
    const conteo = await models.User.findAll({ attributes: ['rol', [sequelize.fn('COUNT', sequelize.col('id')), 'total']], group: ['rol'], raw: true });
    const usuarios = new Map(conteo.map((c) => [c.rol, Number(c.total)]));
    res.json({
      ok: true,
      data: roles.map((r) => ({ ...r.toJSON(), permisos: r.permisos.map((x) => x.clave), usuarios: usuarios.get(r.clave) || 0 })),
    });
  })
);

async function asignarPermisos(rol, claves) {
  if (rol.clave === 'super_admin') throw new AppError('El rol de plataforma siempre tiene todos los permisos', 409, 'ROL_PROTEGIDO');
  const validos = await models.Permiso.findAll({ where: { clave: claves } });
  if (validos.length !== new Set(claves).size) throw new AppError('Hay permisos que no existen', 400, 'PERMISO_INVALIDO');
  if (rol.alcance !== 'plataforma' && claves.some(rbac.esPermisoDePlataforma)) {
    throw new AppError('Los permisos de plataforma solo se asignan a roles de plataforma', 400, 'PERMISO_INVALIDO');
  }
  if (rol.alcance === 'cliente' && claves.length) throw new AppError('El rol de huésped no tiene permisos de panel', 400, 'PERMISO_INVALIDO');
  await models.RolPermiso.destroy({ where: { rol_id: rol.id } });
  await models.RolPermiso.bulkCreate(validos.map((v) => ({ rol_id: rol.id, permiso_id: v.id })));
  rbac.invalidar();
}

router.post(
  '/roles',
  validate(S.crearRol),
  asyncHandler(async (req, res) => {
    const { permisos, ...datos } = req.body;
    if (await models.Rol.findOne({ where: { clave: datos.clave }, attributes: ['id'] })) {
      throw new AppError('Ya existe un rol con esa clave', 409, 'DUPLICADO');
    }
    // Los roles creados desde el panel son siempre de alcance hotel (personal de un alojamiento).
    const rol = await models.Rol.create({ ...datos, alcance: 'hotel', es_sistema: false });
    await asignarPermisos(rol, permisos);
    res.status(201).json({ ok: true, data: rol });
  })
);

router.put(
  '/roles/:id',
  validate(S.actualizarRol),
  asyncHandler(async (req, res) => {
    const rol = await models.Rol.findByPk(req.params.id);
    if (!rol) throw new AppError('Rol no encontrado', 404);
    if (rol.clave === 'super_admin' && req.body.asignable_por_hotel) throw new AppError('Rol protegido', 409, 'ROL_PROTEGIDO');
    await rol.update(req.body);
    rbac.invalidar();
    res.json({ ok: true, data: rol });
  })
);

router.put(
  '/roles/:id/permisos',
  validate(S.permisosRol),
  asyncHandler(async (req, res) => {
    const rol = await models.Rol.findByPk(req.params.id);
    if (!rol) throw new AppError('Rol no encontrado', 404);
    await asignarPermisos(rol, req.body.permisos);
    res.json({ ok: true, data: { rol: rol.clave, permisos: req.body.permisos } });
  })
);

router.delete(
  '/roles/:id',
  asyncHandler(async (req, res) => {
    const rol = await models.Rol.findByPk(req.params.id);
    if (!rol) throw new AppError('Rol no encontrado', 404);
    if (rol.es_sistema) throw new AppError('Los roles del sistema no se pueden eliminar', 409, 'ROL_PROTEGIDO');
    if (await models.User.count({ where: { rol: rol.clave } })) {
      throw new AppError('Hay usuarios con este rol: reasígnalos antes de eliminarlo', 409, 'ROL_EN_USO');
    }
    await models.RolPermiso.destroy({ where: { rol_id: rol.id } });
    await rol.destroy();
    rbac.invalidar();
    res.json({ ok: true, message: 'Rol eliminado' });
  })
);

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    const items = await models.MenuItem.findAll({
      include: [{ model: models.Permiso, as: 'permiso', attributes: ['clave'] }],
      order: [['orden', 'ASC']],
    });
    res.json({ ok: true, data: items.map((i) => ({ ...i.toJSON(), permiso: i.permiso?.clave ?? null })) });
  })
);

router.put(
  '/menu/:id',
  validate(S.actualizarMenu),
  asyncHandler(async (req, res) => {
    const item = await models.MenuItem.findByPk(req.params.id, { include: [{ model: models.Permiso, as: 'permiso' }] });
    if (!item) throw new AppError('Opción de menú no encontrada', 404);
    const { permiso, ...cambios } = req.body;
    // Evita que la plataforma se quede sin acceso al propio panel de administración.
    if (item.permiso?.clave.startsWith('plataforma.') && (cambios.activo === false || (permiso !== undefined && permiso !== item.permiso.clave))) {
      throw new AppError('Esta opción no se puede desactivar ni cambiar de permiso', 409, 'MENU_PROTEGIDO');
    }
    if (permiso !== undefined) {
      const p = permiso ? await models.Permiso.findOne({ where: { clave: permiso } }) : null;
      if (permiso && !p) throw new AppError('Permiso inválido', 400);
      cambios.permiso_id = p ? p.id : null;
    }
    await item.update(cambios);
    rbac.invalidar();
    res.json({ ok: true, data: item });
  })
);

module.exports = router;
