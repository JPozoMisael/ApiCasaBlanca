const tiposService = require('../services/tipos_habitacion.service');

async function listar(req, res, next) {
  try {
    const tipos = await tiposService.listarTipos();

    res.status(200).json({
      ok: true,
      data: tipos,
      meta: { total: tipos.length },
    });

  } catch (error) {
    console.error('Error listar tipos:', error.message);
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

    const tipo = await tiposService.obtenerTipoPorId(id);

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
    console.error('Error obtener tipo:', error.message);
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const tipo = await tiposService.crearTipo(req.body);

    res.status(201).json({
      ok: true,
      message: 'Tipo creado correctamente',
      data: tipo,
    });

  } catch (error) {
    console.error('Error crear tipo:', error.message);
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

    const tipo = await tiposService.actualizarTipo(id, req.body);

    if (!tipo) {
      return res.status(404).json({
        ok: false,
        message: 'Tipo no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Tipo actualizado correctamente',
      data: tipo,
    });

  } catch (error) {
    console.error('Error actualizar tipo:', error.message);
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

    const okDelete = await tiposService.eliminarTipo(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Tipo no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Tipo eliminado correctamente',
    });

  } catch (error) {
    console.error('Error eliminar tipo:', error.message);
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