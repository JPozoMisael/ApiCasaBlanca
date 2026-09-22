const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { auth, authOpcional } = require('../middleware/auth.middleware');
const { permiso, tienePermiso } = require('../middleware/roles.middleware');
const { limiterReservas, limiterConsulta } = require('../middleware/rateLimit.middleware');
const S = require('../validators/schemas');
const reservas = require('../services/reservas.service');
const { AppError } = require('../utils/errors');

const router = express.Router();
const gestionar = permiso('reservas.gestionar');

// Personal (alcance != cliente) necesita el permiso; los huéspedes siguen su propio flujo.
const requierePersonal = (clave) => (req, res, next) =>
  req.user.alcance !== 'cliente' && !tienePermiso(req.user, clave)
    ? next(new AppError('Acceso denegado: permisos insuficientes', 403, 'PERMISOS_INSUFICIENTES'))
    : next();

/* ---------- Público ---------- */

// Cotización sin crear nada: precios por noche, impuestos y política de cancelación.
router.post(
  '/quote',
  validate(S.cotizarReserva),
  asyncHandler(async (req, res) => res.json({ ok: true, data: await reservas.cotizar(req.body) }))
);

// Crear reserva: invitado (con contacto), cliente autenticado o personal del hotel.
router.post(
  '/',
  limiterReservas,
  authOpcional,
  validate(S.crearReserva),
  asyncHandler(async (req, res) => {
    const esStaff = req.user && req.user.alcance !== 'cliente';
    if (esStaff && !tienePermiso(req.user, 'reservas.gestionar')) {
      throw new AppError('Acceso denegado: permisos insuficientes', 403, 'PERMISOS_INSUFICIENTES');
    }
    // Solo el personal puede fijar habitaciones concretas, cliente_id, canal o estado inicial.
    if (!esStaff) {
      const pideExtras =
        req.body.cliente_id || req.body.canal || req.body.estado_inicial || req.body.habitaciones.some((h) => h.habitacion_id);
      if (pideExtras) throw new AppError('Operación reservada al personal del hotel', 403, 'SOLO_PERSONAL');
    }
    const data = await reservas.crearReserva(req.body, req.user);
    res.status(201).json({ ok: true, message: 'Reserva creada', data });
  })
);

// Invitado consulta su reserva con código + email.
router.post(
  '/lookup',
  limiterConsulta,
  validate(S.consultaReserva),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await reservas.consultarPorCodigo(req.body.codigo, req.body.email) });
  })
);

router.post(
  '/lookup/cancelar',
  limiterConsulta,
  validate(S.consultaReserva.keys({ motivo: S.cancelarReserva.extract('motivo') })),
  asyncHandler(async (req, res) => {
    const data = await reservas.cancelarComoInvitado(req.body.codigo, req.body.email, req.body.motivo);
    res.json({ ok: true, message: 'Reserva cancelada', data });
  })
);

/* ---------- Autenticado ---------- */

// Cliente: sus reservas. Personal: las de su hotel.
router.get(
  '/',
  auth,
  requierePersonal('reservas.ver'),
  validate(S.filtrosReservas, 'query'),
  asyncHandler(async (req, res) => {
    const r = await reservas.listarReservas(req.user, req.valid.query);
    res.json({ ok: true, ...r });
  })
);

router.get(
  '/:id',
  auth,
  requierePersonal('reservas.ver'),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await reservas.obtenerReserva(req.params.id, req.user) });
  })
);

// Cancelar: el cliente su propia reserva; el personal cualquiera de su hotel.
router.patch(
  '/:id/cancelar',
  auth,
  requierePersonal('reservas.gestionar'),
  validate(S.cancelarReserva),
  asyncHandler(async (req, res) => {
    const data = await reservas.cambiarEstado(req.params.id, 'cancelada', req.user, { motivo: req.body.motivo });
    res.json({ ok: true, message: 'Reserva cancelada', data });
  })
);

/* ---------- Personal del hotel ---------- */
const transicion = (ruta, estado) =>
  router.patch(
    `/:id/${ruta}`,
    auth,
    gestionar,
    asyncHandler(async (req, res) => {
      res.json({ ok: true, data: await reservas.cambiarEstado(req.params.id, estado, req.user) });
    })
  );

transicion('confirmar', 'confirmada');
transicion('checkin', 'check_in');
transicion('checkout', 'check_out');
transicion('no-show', 'no_show');

router.put(
  '/:id',
  auth,
  gestionar,
  validate(S.actualizarReserva),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await reservas.actualizarReserva(req.params.id, req.body, req.user) });
  })
);

module.exports = router;
