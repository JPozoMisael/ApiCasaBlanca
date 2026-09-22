const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const { permiso } = require('../middleware/roles.middleware');
const { tenant, hotelObligatorio } = require('../middleware/tenant.middleware');
const S = require('../validators/schemas');
const { models } = require('../models');
const { AppError } = require('../utils/errors');
const canales = require('../services/canales.service');
const { credencialesConfiguradas } = require('../integrations/siteminder/entrada.service');
const { envioConfigurado, enviarEnSegundoPlano } = require('../integrations/siteminder/salida.service');

// Administración de la conexión del hotel con su channel manager (SiteMinder / Little Hotelier).
const router = express.Router();
router.use(auth, tenant, permiso('canales.gestionar'));

router.get(
  '/connection',
  asyncHandler(async (req, res) => {
    const data = await canales.obtener(hotelObligatorio(req));
    res.json({
      ok: true,
      data,
      config: {
        endpoint_entrada: `${req.protocol}://${req.get('host')}${req.baseUrl}/siteminder`,
        entrada_configurada: credencialesConfiguradas(),
        envio_configurado: envioConfigurado(),
      },
    });
  })
);

router.post(
  '/connection',
  validate(S.conectarCanal),
  asyncHandler(async (req, res) => {
    res.status(201).json({ ok: true, data: await canales.conectar(hotelObligatorio(req), req.body) });
  })
);

router.put(
  '/connection',
  validate(S.actualizarConexionCanal),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await canales.actualizar(hotelObligatorio(req), req.body) });
  })
);

// Incluye tipos de habitación creados después de conectar.
router.post(
  '/connection/sync-types',
  asyncHandler(async (req, res) => {
    const conexion = await models.CanalConexion.findOne({ where: { hotel_id: hotelObligatorio(req), proveedor: 'siteminder' } });
    if (!conexion) throw new AppError('Este alojamiento no tiene conexión con SiteMinder', 404);
    await canales.sincronizarMapeos(conexion);
    res.json({ ok: true, data: await canales.obtener(conexion.hotel_id) });
  })
);

router.put(
  '/mappings/:id',
  validate(S.mapeoCanal),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await canales.editarMapeo(hotelObligatorio(req), Number(req.params.id), req.body.codigo) });
  })
);

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const data = await models.CanalMensaje.findAll({ where: { hotel_id: hotelObligatorio(req) }, order: [['id', 'DESC']], limit });
    res.json({ ok: true, data });
  })
);

router.get(
  '/outbox',
  asyncHandler(async (req, res) => {
    const data = await models.CanalSalida.findAll({
      where: { hotel_id: hotelObligatorio(req) },
      include: [{ model: models.Reserva, as: 'reserva', attributes: ['id', 'codigo_reserva', 'estado', 'fecha_entrada', 'fecha_salida'] }],
      order: [['id', 'DESC']],
      limit: 100,
    });
    res.json({ ok: true, data });
  })
);

// Reintento manual de un envío que el channel manager rechazó o que agotó sus intentos.
router.post(
  '/outbox/:id/retry',
  asyncHandler(async (req, res) => {
    const fila = await models.CanalSalida.findByPk(req.params.id);
    if (!fila || fila.hotel_id !== hotelObligatorio(req)) throw new AppError('Envío no encontrado', 404);
    if (fila.estado !== 'error') throw new AppError('Solo se pueden reintentar envíos con error', 409);
    await fila.update({ estado: 'pendiente', intentos: 0, proximo_intento: new Date(), ultimo_error: null });
    enviarEnSegundoPlano();
    res.json({ ok: true, data: fila });
  })
);

module.exports = router;
