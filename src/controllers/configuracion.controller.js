const { Configuracion } = require('../models');

// =========================================
// LISTAR CONFIGURACIONES
// =========================================

async function listar(req, res, next) {

  try {

    const configs = await Configuracion.findAll({
      order: [['clave', 'ASC']],
    });

    return res.json({
      ok: true,
      data: configs,
    });

  } catch (error) {

    next(error);
  }
}

// =========================================
// OBTENER CONFIGURACION
// =========================================

async function obtenerPorClave(req, res, next) {

  try {

    const { clave } = req.params;

    const { hotel_id } = req.query;

    const config = await Configuracion.findOne({
      where: {
        hotel_id,
        clave,
      },
    });

    if (!config) {

      return res.status(404).json({
        ok: false,
        message: 'Configuración no encontrada',
      });
    }

    return res.json({
      ok: true,
      data: config,
    });

  } catch (error) {

    next(error);
  }
}

// =========================================
// ACTUALIZAR CONFIGURACION
// =========================================

async function actualizar(req, res, next) {

  try {

    const { clave } = req.params;

    const { hotel_id, valor } = req.body;

    const config = await Configuracion.findOne({
      where: {
        hotel_id,
        clave,
      },
    });

    if (!config) {

      return res.status(404).json({
        ok: false,
        message: 'Configuración no encontrada',
      });
    }

    await config.update({
      valor,
    });

    return res.json({
      ok: true,
      data: config,
      message: 'Configuración actualizada',
    });

  } catch (error) {

    next(error);
  }
}

// =========================================
// CREAR CONFIGURACION
// =========================================

async function crear(req, res, next) {

  try {

    const {
      hotel_id,
      clave,
      valor,
      tipo,
    } = req.body;

    const existe = await Configuracion.findOne({
      where: {
        hotel_id,
        clave,
      },
    });

    if (existe) {

      return res.status(400).json({
        ok: false,
        message: 'La clave ya existe para este hotel',
      });
    }

    const config = await Configuracion.create({
      hotel_id,
      clave,
      valor: valor || '',
      tipo: tipo || 'text',
    });

    return res.status(201).json({
      ok: true,
      data: config,
      message: 'Configuración creada',
    });

  } catch (error) {

    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorClave,
  actualizar,
  crear,
};