const reservasService = require('../services/reservas.service');

/**
 * POST /api/v1/reservas
 * Público (reserva online)
 */
async function crear(req, res, next) {
  try {
    const resultado = await reservasService.crearReserva(req.body);

    res.status(201).json({
      ok: true,
      message: 'Reserva creada correctamente',
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reservas
 * Protegido (admin / empleado)
 * Filtros opcionales:
 *  ?hotel_id
 *  ?cliente_id
 *  ?estado
 */
async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id,
      cliente_id: req.query.cliente_id,
      estado: req.query.estado,
    };

    const reservas = await reservasService.listarReservas(filtros);

    res.status(200).json({
      ok: true,
      data: reservas,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reservas/:id
 * Protegido
 */
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;

    const reserva = await reservasService.obtenerReservaPorId(id);

    if (!reserva) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      data: reserva,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/reservas/:id
 * Protegido
 * Actualiza datos básicos (NO detalles ni pagos)
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;

    const reserva = await reservasService.actualizarReserva(id, req.body);

    if (!reserva) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Reserva actualizada correctamente',
      data: reserva,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/reservas/:id/cancelar
 * Protegido
 */
async function cancelar(req, res, next) {
  try {
    const { id } = req.params;

    const reserva = await reservasService.cancelarReserva(id);

    if (!reserva) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Reserva cancelada correctamente',
      data: reserva,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  cancelar,
};
