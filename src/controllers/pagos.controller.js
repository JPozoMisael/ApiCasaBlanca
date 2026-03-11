// src/controllers/pagos.controller.js
const pagosService = require('../services/pagos.service');
const { ok } = require('../utils/response');

const listarPorReserva = async (req, res, next) => {
  try {
    const { reserva_id, estado } = req.query;
    const pagos = await pagosService.listarPagos({ reserva_id, estado });
    return ok(res, pagos, 'Pagos obtenidos');
  } catch (err) {
    next(err);
  }
};

const crear = async (req, res, next) => {
  try {
    const nuevo = await pagosService.registrarPago(req.body);
    return ok(res, nuevo, 'Pago registrado', 201);
  } catch (err) {
    next(err);
  }
};

const crearYConfirmar = async (req, res, next) => {
  try {
    const resultado = await pagosService.registrarPagoYConfirmarReserva(req.body);
    return ok(res, resultado, 'Pago registrado y reserva confirmada', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { listarPorReserva, crear, crearYConfirmar };
