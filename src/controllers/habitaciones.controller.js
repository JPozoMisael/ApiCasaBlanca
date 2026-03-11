const habitacionesService = require('../services/habitacion.service');

/**
 * GET /api/v1/habitaciones
 * Filtros opcionales:
 *  ?hotel_id
 *  ?tipo_habitacion_id
 *  ?estado
 */
async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id,
      tipo_habitacion_id: req.query.tipo_habitacion_id,
      estado: req.query.estado,
    };

    const habitaciones = await habitacionesService.listarHabitaciones(filtros);

    res.status(200).json({
      ok: true,
      data: habitaciones,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/habitaciones/:id
 */
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;

    const habitacion = await habitacionesService.obtenerHabitacionPorId(id);

    if (!habitacion) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      data: habitacion,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/habitaciones
 * Protegido en routes (admin/empleado)
 */
async function crear(req, res, next) {
  try {
    const habitacion = await habitacionesService.crearHabitacion(req.body);

    res.status(201).json({
      ok: true,
      message: 'Habitación creada correctamente',
      data: habitacion,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/habitaciones/:id
 * Protegido en routes (admin/empleado)
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;

    const habitacion = await habitacionesService.actualizarHabitacion(id, req.body);

    if (!habitacion) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Habitación actualizada correctamente',
      data: habitacion,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/habitaciones/:id
 * Protegido en routes (admin)
 */
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;

    const okDelete = await habitacionesService.eliminarHabitacion(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Habitación eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
