const pagosService = require('../services/pagos.service');
const { ok } = require('../utils/response');

const listarPorReserva = async (req, res, next) => {
  try {
    const { reserva_id, estado } = req.query;

    if (!reserva_id || isNaN(Number(reserva_id))) {
      return res.status(400).json({
        ok: false,
        message: 'reserva_id es requerido y debe ser numérico',
      });
    }

    const pagos = await pagosService.listarPagos({
      reserva_id: Number(reserva_id),
      estado,
    });

    return ok(res, pagos, 'Pagos obtenidos');

  } catch (err) {
    console.error('Error listar pagos:', err.message);
    next(err);
  }
};

module.exports = {
  listarPorReserva,
};