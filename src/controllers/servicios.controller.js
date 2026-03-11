// src/controllers/servicios.controller.js
const serviciosService = require('../services/servicios.service');

/**
 * GET /api/v1/servicios
 * Filtros opcionales:
 *  ?hotel_id
 *  ?esta_activo=true|false
 */
async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id,
      esta_activo:
        typeof req.query.esta_activo === 'undefined'
          ? undefined
          : String(req.query.esta_activo).toLowerCase() === 'true',
    };

    const servicios = await serviciosService.listarServicios(filtros);

    res.status(200).json({
      ok: true,
      data: servicios,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/servicios/:id
 */
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;

    const servicio = await serviciosService.obtenerServicioPorId(id);

    if (!servicio) {
      return res.status(404).json({
        ok: false,
        message: 'Servicio no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      data: servicio,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/servicios
 * Protegido en routes (admin)
 */
async function crear(req, res, next) {
  try {
    const servicio = await serviciosService.crearServicio(req.body);

    res.status(201).json({
      ok: true,
      message: 'Servicio creado correctamente',
      data: servicio,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/servicios/:id
 * Protegido en routes (admin)
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;

    const servicio = await serviciosService.actualizarServicio(id, req.body);

    if (!servicio) {
      return res.status(404).json({
        ok: false,
        message: 'Servicio no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Servicio actualizado correctamente',
      data: servicio,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/servicios/:id
 * Protegido en routes (admin)
 */
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;

    const okDelete = await serviciosService.eliminarServicio(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Servicio no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Servicio eliminado correctamente',
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
