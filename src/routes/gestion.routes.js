const express = require('express');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const crudHotel = require('../utils/crudHotel');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const { permiso, tienePermiso } = require('../middleware/roles.middleware');
const rbac = require('../services/rbac.service');
const { tenant, filtroHotel, hotelObligatorio, verificarPertenencia } = require('../middleware/tenant.middleware');
const S = require('../validators/schemas');
const { models } = require('../models');
const { AppError } = require('../utils/errors');
const C = require('../config/constants');
const hotelesService = require('../services/hoteles.service');
const pagos = require('../services/pagos.service');
const reportes = require('../services/reportes.service');
const valoraciones = require('../services/valoraciones.service');
const { hoyISO, sumarDias, esFechaValida } = require('../utils/dates');

/*
| Panel de gestión de un hotel. Todo queda acotado al hotel del usuario (ver tenant.middleware).
*/
const router = express.Router();


/* ======================================================
   CRUD de recursos del hotel
====================================================== */
router.use(
  '/room-types',
  crudHotel({
    Model: models.TipoHabitacion,
    lectura: ['habitaciones.ver'],
    escritura: ['habitaciones.gestionar'],
    schemas: { crear: S.crearTipoHabitacion, actualizar: S.actualizarTipoHabitacion },
    filtros: ['estado'],
    include: [
      { model: models.Amenidad, as: 'amenidades', through: { attributes: [] } },
      { model: models.Imagen, as: 'imagenes' },
    ],
    // Con habitaciones asociadas se desactiva en lugar de borrar.
    antesDeBorrar: async (tipo) => {
      if (await models.Habitacion.count({ where: { tipo_habitacion_id: tipo.id } })) {
        await tipo.update({ estado: 'inactivo' });
        return true;
      }
      return false;
    },
  })
);

router.use(
  '/rooms',
  crudHotel({
    Model: models.Habitacion,
    lectura: ['habitaciones.ver'],
    escritura: ['habitaciones.gestionar'],
    schemas: { crear: S.crearHabitacion, actualizar: S.actualizarHabitacion },
    filtros: ['tipo_habitacion_id', 'estado'],
    relaciones: { tipo_habitacion_id: models.TipoHabitacion },
    include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre', 'capacidad_maxima', 'precio_base'] }],
    orden: [['numero_habitacion', 'ASC']],
    // Limpieza/recepción cambian el estado; el resto de datos exige 'habitaciones.gestionar'.
    edicion: ['habitaciones.estado', 'habitaciones.gestionar'],
    edicionParcial: { requiere: 'habitaciones.gestionar', campos: ['estado'] },
    antesDeBorrar: async (hab) => {
      if (await models.DetalleReserva.count({ where: { habitacion_id: hab.id } })) {
        await hab.update({ estado: 'inactiva' });
        return true;
      }
      return false;
    },
  })
);

router.use(
  '/services',
  crudHotel({
    Model: models.Servicio,
    lectura: ['servicios.gestionar'],
    escritura: ['servicios.gestionar'],
    schemas: { crear: S.crearServicio, actualizar: S.actualizarServicio },
    filtros: ['estado', 'tipo'],
    orden: [['nombre', 'ASC']],
    antesDeBorrar: async (servicio) => {
      if (await models.ServicioReserva.count({ where: { servicio_id: servicio.id } })) {
        await servicio.update({ estado: 'inactivo' });
        return true;
      }
      return false;
    },
  })
);

router.use(
  '/temporadas',
  crudHotel({
    Model: models.Temporada,
    lectura: ['tarifas.gestionar'],
    escritura: ['tarifas.gestionar'],
    schemas: { crear: S.crearTemporada, actualizar: S.actualizarTemporada },
    filtros: ['estado', 'tipo'],
    orden: [['fecha_inicio', 'ASC']],
  })
);

router.use(
  '/tarifas',
  crudHotel({
    Model: models.TarifaHabitacion,
    lectura: ['tarifas.gestionar'],
    escritura: ['tarifas.gestionar'],
    schemas: { crear: S.crearTarifa, actualizar: S.actualizarTarifa },
    filtros: ['tipo_habitacion_id', 'temporada_id', 'tipo_dia', 'estado'],
    relaciones: { tipo_habitacion_id: models.TipoHabitacion, temporada_id: models.Temporada },
    include: [
      { model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre'] },
      { model: models.Temporada, as: 'temporada', attributes: ['id', 'nombre', 'fecha_inicio', 'fecha_fin'] },
    ],
  })
);

router.use(
  '/images',
  crudHotel({
    Model: models.Imagen,
    lectura: ['hotel.editar'],
    escritura: ['hotel.editar'],
    schemas: { crear: S.crearImagen, actualizar: S.actualizarImagen },
    filtros: ['tipo_habitacion_id'],
    relaciones: { tipo_habitacion_id: models.TipoHabitacion },
    orden: [['orden', 'ASC'], ['id', 'ASC']],
  })
);

router.use(
  '/configuracion',
  crudHotel({
    Model: models.Configuracion,
    lectura: ['hotel.editar'],
    escritura: ['hotel.editar'],
    schemas: { crear: S.crearConfiguracion, actualizar: S.actualizarConfiguracion },
    orden: [['clave', 'ASC']],
  })
);

/* ======================================================
   Amenidades de un tipo de habitación
====================================================== */
router.put(
  '/room-types/:id/amenidades',
  auth, tenant, permiso('habitaciones.gestionar'),
  validate(S.amenidadesHotel),
  asyncHandler(async (req, res) => {
    const tipo = verificarPertenencia(req, await models.TipoHabitacion.findByPk(req.params.id));
    const validas = await models.Amenidad.findAll({ where: { id: { [Op.in]: req.body.amenidades } }, attributes: ['id'], raw: true });
    await models.TipoHabitacionAmenidad.destroy({ where: { tipo_habitacion_id: tipo.id } });
    await models.TipoHabitacionAmenidad.bulkCreate(validas.map((a) => ({ tipo_habitacion_id: tipo.id, amenidad_id: a.id })));
    res.json({ ok: true, data: { total: validas.length } });
  })
);

/* ======================================================
   Perfil del hotel
====================================================== */
router.get(
  '/manage/hotel',
  auth, tenant,
  asyncHandler(async (req, res) => {
    const id = hotelObligatorio(req);
    const hotel = await models.Hotel.findByPk(id, {
      include: [
        { model: models.Zona, as: 'zona' },
        { model: models.Amenidad, as: 'amenidades', through: { attributes: [] } },
        { model: models.Imagen, as: 'imagenes', where: { tipo_habitacion_id: null }, required: false },
      ],
    });
    if (!hotel) throw new AppError('Hotel no encontrado', 404);
    res.json({ ok: true, data: hotel });
  })
);

router.put(
  '/manage/hotel',
  auth, tenant, permiso('hotel.editar'),
  validate(S.actualizarHotel),
  asyncHandler(async (req, res) => {
    const hotel = await hotelesService.actualizarHotel(hotelObligatorio(req), req.body, req.user);
    res.json({ ok: true, data: hotel });
  })
);

router.put(
  '/manage/hotel/amenidades',
  auth, tenant, permiso('hotel.editar'),
  validate(S.amenidadesHotel),
  asyncHandler(async (req, res) => {
    const total = await hotelesService.reemplazarAmenidades(hotelObligatorio(req), req.body.amenidades, req.user);
    res.json({ ok: true, data: { total } });
  })
);

/* ======================================================
   Bloqueos de habitaciones (mantenimiento, etc.)
====================================================== */
router.get(
  '/bloqueos',
  auth, tenant, permiso('habitaciones.ver'),
  asyncHandler(async (req, res) => {
    const data = await models.BloqueoHabitacion.findAll({
      include: [{ model: models.Habitacion, as: 'habitacion', attributes: ['id', 'numero_habitacion', 'hotel_id'], where: filtroHotel(req), required: true }],
      order: [['fecha_inicio', 'DESC']],
    });
    res.json({ ok: true, data });
  })
);

router.post(
  '/bloqueos',
  auth, tenant, permiso('bloqueos.gestionar'),
  validate(S.crearBloqueo),
  asyncHandler(async (req, res) => {
    const hab = verificarPertenencia(req, await models.Habitacion.findByPk(req.body.habitacion_id, { attributes: ['id', 'hotel_id'] }));
    if (req.body.fecha_fin < req.body.fecha_inicio) throw new AppError('fecha_fin no puede ser anterior a fecha_inicio', 400);
    const data = await models.BloqueoHabitacion.create({ ...req.body, habitacion_id: hab.id });
    res.status(201).json({ ok: true, data });
  })
);

router.put(
  '/bloqueos/:id',
  auth, tenant, permiso('bloqueos.gestionar'),
  validate(S.actualizarBloqueo),
  asyncHandler(async (req, res) => {
    const bloqueo = await models.BloqueoHabitacion.findByPk(req.params.id, {
      include: [{ model: models.Habitacion, as: 'habitacion', attributes: ['hotel_id'] }],
    });
    if (!bloqueo) throw new AppError('Bloqueo no encontrado', 404);
    verificarPertenencia(req, bloqueo.habitacion);
    const { habitacion_id, ...cambios } = req.body; // no se reasigna a otra habitación
    await bloqueo.update(cambios);
    res.json({ ok: true, data: bloqueo });
  })
);

router.delete(
  '/bloqueos/:id',
  auth, tenant, permiso('bloqueos.gestionar'),
  asyncHandler(async (req, res) => {
    const bloqueo = await models.BloqueoHabitacion.findByPk(req.params.id, {
      include: [{ model: models.Habitacion, as: 'habitacion', attributes: ['hotel_id'] }],
    });
    if (!bloqueo) throw new AppError('Bloqueo no encontrado', 404);
    verificarPertenencia(req, bloqueo.habitacion);
    await bloqueo.destroy();
    res.json({ ok: true, message: 'Bloqueo eliminado' });
  })
);

/* ======================================================
   Huéspedes: solo los que tienen reservas en el hotel
====================================================== */
router.get(
  '/clients',
  auth, tenant, permiso('huespedes.ver'),
  asyncHandler(async (req, res) => {
    const texto = String(req.query.texto || '').trim();
    const where = texto
      ? { [Op.or]: ['nombres', 'apellidos', 'email', 'documento_identidad'].map((c) => ({ [c]: { [Op.like]: `%${texto}%` } })) }
      : {};
    const data = await models.Cliente.findAll({
      where,
      include: [{ model: models.Reserva, as: 'reservas', attributes: ['id'], where: filtroHotel(req), required: true }],
      order: [['id', 'DESC']],
      limit: 200,
    });
    res.json({ ok: true, data, meta: { total: data.length } });
  })
);

/* ======================================================
   Calendario de ocupación (habitaciones × días)
====================================================== */
router.get(
  '/calendar',
  auth, tenant, permiso('calendario.ver'),
  asyncHandler(async (req, res) => {
    const hotelId = hotelObligatorio(req);
    const desde = req.query.desde || hoyISO();
    if (!esFechaValida(desde)) throw new AppError('Fecha inválida (YYYY-MM-DD)', 400);
    const dias = Math.min(62, Math.max(1, Number(req.query.dias) || 14));
    const hasta = sumarDias(desde, dias); // exclusivo

    const habitaciones = await models.Habitacion.findAll({
      where: { hotel_id: hotelId, estado: { [Op.ne]: 'inactiva' } },
      attributes: ['id', 'numero_habitacion', 'piso', 'estado', 'tipo_habitacion_id'],
      include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre'] }],
      order: [['tipo_habitacion_id', 'ASC'], ['numero_habitacion', 'ASC']],
    });
    const ids = habitaciones.map((h) => h.id);

    const reservas = await models.Reserva.findAll({
      where: {
        hotel_id: hotelId,
        estado: { [Op.in]: ['pendiente', 'confirmada', 'check_in', 'check_out'] },
        fecha_entrada: { [Op.lt]: hasta },
        fecha_salida: { [Op.gt]: desde },
        // una retención vencida ya no ocupa la habitación
        [Op.or]: [{ estado: { [Op.ne]: 'pendiente' } }, { expira_en: null }, { expira_en: { [Op.gt]: new Date() } }],
      },
      attributes: ['id', 'codigo_reserva', 'estado', 'fecha_entrada', 'fecha_salida', 'num_huespedes', 'canal'],
      include: [
        { model: models.Cliente, as: 'cliente', attributes: ['nombres', 'apellidos'] },
        { model: models.DetalleReserva, as: 'detalles', attributes: ['habitacion_id'] },
      ],
      order: [['fecha_entrada', 'ASC']],
    });

    const bloqueos = ids.length
      ? await models.BloqueoHabitacion.findAll({
          where: { habitacion_id: { [Op.in]: ids }, estado: 'activo', fecha_inicio: { [Op.lt]: hasta }, fecha_fin: { [Op.gte]: desde } },
          attributes: ['id', 'habitacion_id', 'fecha_inicio', 'fecha_fin', 'tipo_bloqueo', 'motivo'],
        })
      : [];

    res.json({
      ok: true,
      data: {
        desde,
        hasta,
        dias,
        habitaciones,
        reservas: reservas.map((r) => ({
          id: r.id,
          codigo_reserva: r.codigo_reserva,
          estado: r.estado,
          fecha_entrada: r.fecha_entrada,
          fecha_salida: r.fecha_salida,
          num_huespedes: r.num_huespedes,
          canal: r.canal,
          huesped: r.cliente ? `${r.cliente.nombres} ${r.cliente.apellidos}` : '',
          habitaciones: r.detalles.map((d) => d.habitacion_id),
        })),
        bloqueos,
      },
    });
  })
);

/* ======================================================
   Pagos
====================================================== */
router.get(
  '/payments',
  auth, tenant, permiso('pagos.ver'),
  asyncHandler(async (req, res) => {
    const r = await pagos.listar({
      hotelId: req.hotelId,
      reserva_id: req.query.reserva_id,
      estado: req.query.estado,
      metodo: req.query.metodo,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ ok: true, ...r });
  })
);

router.post(
  '/payments',
  auth, tenant, permiso('pagos.registrar'),
  validate(S.registrarPago),
  asyncHandler(async (req, res) => {
    res.status(201).json({ ok: true, data: await pagos.registrar(req.body, req.hotelId) });
  })
);

/* ======================================================
   Reservas del día (recepción)
====================================================== */
router.get(
  '/frontdesk/today',
  auth, tenant, permiso('reservas.ver'),
  asyncHandler(async (req, res) => {
    const hoy = hoyISO();
    const base = filtroHotel(req);
    const incluir = [
      { model: models.Cliente, as: 'cliente', attributes: ['id', 'nombres', 'apellidos', 'telefono'] },
      { model: models.DetalleReserva, as: 'detalles', include: [{ model: models.Habitacion, as: 'habitacion', attributes: ['id', 'numero_habitacion'] }] },
    ];
    const [llegadas, salidas, enCasa] = await Promise.all([
      models.Reserva.findAll({ where: { ...base, fecha_entrada: hoy, estado: 'confirmada' }, include: incluir }),
      models.Reserva.findAll({ where: { ...base, fecha_salida: hoy, estado: 'check_in' }, include: incluir }),
      models.Reserva.findAll({ where: { ...base, estado: 'check_in' }, include: incluir }),
    ]);
    res.json({ ok: true, data: { fecha: hoy, llegadas, salidas, en_casa: enCasa } });
  })
);

/* ======================================================
   Reportes
====================================================== */
function rango(req) {
  const hasta = req.query.hasta || hoyISO();
  const desde = req.query.desde || sumarDias(hasta, -29);
  if (!esFechaValida(desde) || !esFechaValida(hasta) || desde > hasta) {
    throw new AppError('Rango de fechas inválido', 400);
  }
  return { desde, hasta };
}

router.get(
  '/reports/dashboard',
  auth, tenant, permiso('dashboard.ver'),
  asyncHandler(async (req, res) => res.json({ ok: true, data: await reportes.dashboard(req.hotelId) }))
);

router.get(
  '/reports/ocupacion',
  auth, tenant, permiso('reportes.ver'),
  asyncHandler(async (req, res) => {
    const { desde, hasta } = rango(req);
    res.json({ ok: true, data: await reportes.ocupacion(req.hotelId, desde, hasta) });
  })
);

router.get(
  '/reports/ingresos',
  auth, tenant, permiso('reportes.ver'),
  asyncHandler(async (req, res) => {
    const { desde, hasta } = rango(req);
    res.json({ ok: true, data: await reportes.ingresos(req.hotelId, desde, hasta) });
  })
);

/* ======================================================
   Reseñas: el hotel responde
====================================================== */
router.get(
  '/manage/reviews',
  auth, tenant, permiso('resenas.gestionar'),
  asyncHandler(async (req, res) => {
    const data = await models.Valoracion.findAll({
      where: filtroHotel(req),
      include: [{ model: models.User, as: 'usuario', attributes: ['nombre'] }],
      order: [['fecha', 'DESC']],
      limit: 100,
    });
    res.json({ ok: true, data });
  })
);

router.post(
  '/manage/reviews/:id/respuesta',
  auth, tenant, permiso('resenas.gestionar'),
  validate(S.responderValoracion),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await valoraciones.responder(req.params.id, req.body.respuesta, req.user) });
  })
);

/* ======================================================
   Usuarios del hotel (admin crea recepción; super_admin también admins)
====================================================== */
// Roles que quien consulta puede asignar al personal (los define la plataforma en la base de datos).
router.get(
  '/admin/roles',
  auth, tenant, permiso('personal.gestionar'),
  asyncHandler(async (req, res) => {
    const roles = req.esSuperAdmin ? await rbac.rolesDeHotel() : await rbac.rolesAsignablesPorHotel();
    res.json({ ok: true, data: roles.map(({ clave, nombre }) => ({ clave, nombre })) });
  })
);

router.get(
  '/admin/usuarios',
  auth, tenant, permiso('personal.gestionar'),
  asyncHandler(async (req, res) => {
    const roles = await rbac.rolesDeHotel();
    const data = await models.User.findAll({
      where: { ...filtroHotel(req), rol: { [Op.in]: roles.map((r) => r.clave) } },
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']],
    });
    res.json({ ok: true, data });
  })
);

router.post(
  '/admin/usuarios',
  auth, tenant, permiso('personal.gestionar'),
  validate(S.crearUsuarioStaff),
  asyncHandler(async (req, res) => {
    const hotelId = hotelObligatorio(req);
    const rol = await rbac.infoRol(req.body.rol);
    // Solo roles de hotel; y un admin de hotel solo puede asignar los que la plataforma le permite.
    if (rol.alcance !== 'hotel') throw new AppError('Rol inválido', 400, 'ROL_INVALIDO');
    if (!req.esSuperAdmin && !rol.asignable_por_hotel) {
      throw new AppError('No puedes asignar ese rol', 403, 'PERMISOS_INSUFICIENTES');
    }
    if (await models.User.findOne({ where: { email: req.body.email }, attributes: ['id'] })) {
      throw new AppError('Ya existe un usuario con ese email', 409, 'EMAIL_DUPLICADO');
    }
    const user = await models.User.create({ ...req.body, hotel_id: hotelId });
    res.status(201).json({ ok: true, data: { id: user.id, email: user.email, rol: user.rol, hotel_id: hotelId } });
  })
);

router.patch(
  '/admin/usuarios/:id/estado',
  auth, tenant, permiso('personal.gestionar'),
  asyncHandler(async (req, res) => {
    const user = verificarPertenencia(req, await models.User.findByPk(req.params.id));
    if (user.id === req.user.id) throw new AppError('No puedes desactivar tu propia cuenta', 400);
    const rol = await rbac.infoRol(user.rol);
    if (rol.alcance !== 'hotel') throw new AppError('Recurso no encontrado', 404);
    // Un admin de hotel solo gestiona roles asignables (p. ej. recepción); administradores, solo la plataforma.
    if (!req.esSuperAdmin && !rol.asignable_por_hotel) {
      throw new AppError('Solo la plataforma puede modificar a este usuario', 403, 'PERMISOS_INSUFICIENTES');
    }
    const estado = req.body.estado === 'inactivo' ? 'inactivo' : 'activo';
    await user.update({ estado });
    res.json({ ok: true, data: { id: user.id, estado } });
  })
);

module.exports = router;
