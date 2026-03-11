const tiposHabitacionService = require('../services/tipos_habitacion.service');

/**
 * GET /api/v1/tipos-habitacion
 * Filtros opcionales:
 *  ?hotel_id
 */
async function listarPorHotel(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id,
    };

    const tipos = await tiposHabitacionService.listarTipos(filtros);

    res.status(200).json({
      ok: true,
      data: tipos,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/tipos-habitacion/:id
 */
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;

    const tipo = await tiposHabitacionService.obtenerTipoPorId(id);

    if (!tipo) {
      return res.status(404).json({
        ok: false,
        message: 'Tipo de habitación no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      data: tipo,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/tipos-habitacion
 * Protegido en routes (admin)
 */
async function crear(req, res, next) {
  try {
    const tipo = await tiposHabitacionService.crearTipo(req.body);

    res.status(201).json({
      ok: true,
      message: 'Tipo de habitación creado correctamente',
      data: tipo,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/tipos-habitacion/:id
 * Protegido en routes (admin)
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;

    const tipo = await tiposHabitacionService.actualizarTipo(id, req.body);

    if (!tipo) {
      return res.status(404).json({
        ok: false,
        message: 'Tipo de habitación no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Tipo de habitación actualizado correctamente',
      data: tipo,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/tipos-habitacion/:id
 * Protegido en routes (admin)
 */
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;

    const okDelete = await tiposHabitacionService.eliminarTipo(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Tipo de habitación no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Tipo de habitación eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarPorHotel,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
