const serviciosService = require('../services/servicios.service');

async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id ? Number(req.query.hotel_id) : undefined,
      esta_activo:
        typeof req.query.esta_activo === 'undefined'
          ? undefined
          : String(req.query.esta_activo).toLowerCase() === 'true',
    };

    const servicios = await serviciosService.listarServicios(filtros);

    res.status(200).json({
      ok: true,
      data: servicios,
      meta: { total: servicios.length },
    });

  } catch (error) {
    console.error('Error listar servicios:', error.message);
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error obtener servicio:', error.message);
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const servicio = await serviciosService.crearServicio(req.body);

    res.status(201).json({
      ok: true,
      message: 'Servicio creado correctamente',
      data: servicio,
    });

  } catch (error) {
    console.error('Error crear servicio:', error.message);
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error actualizar servicio:', error.message);
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error eliminar servicio:', error.message);
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