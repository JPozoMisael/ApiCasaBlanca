const { Configuracion } = require('../models');

// Listar todas las configuraciones
async function listar(req, res, next) {
  try {
    const configs = await Configuracion.findAll({
      order: [['clave', 'ASC']],
    });
    res.json({ ok: true, data: configs });
  } catch (error) {
    next(error);
  }
}

// Obtener configuración por clave
async function obtenerPorClave(req, res, next) {
  try {
    const { clave } = req.params;
    const config = await Configuracion.findOne({ where: { clave } });
    
    if (!config) {
      return res.status(404).json({ ok: false, message: 'Configuración no encontrada' });
    }
    
    res.json({ ok: true, data: config });
  } catch (error) {
    next(error);
  }
}

// Actualizar configuración
async function actualizar(req, res, next) {
  try {
    const { clave } = req.params;
    const { valor } = req.body;
    
    const config = await Configuracion.findOne({ where: { clave } });
    
    if (!config) {
      return res.status(404).json({ ok: false, message: 'Configuración no encontrada' });
    }
    
    await config.update({ valor });
    res.json({ ok: true, data: config, message: 'Configuración actualizada' });
  } catch (error) {
    next(error);
  }
}

// Crear nueva configuración
async function crear(req, res, next) {
  try {
    const { hotel_id, clave, valor, tipo } = req.body;
    
    const existe = await Configuracion.findOne({ where: { clave } });
    if (existe) {
      return res.status(400).json({ ok: false, message: 'La clave ya existe' });
    }
    
    const config = await Configuracion.create({
      hotel_id,
      clave,
      valor: valor || '',
      tipo: tipo || 'text',
    });
    
    res.status(201).json({ ok: true, data: config, message: 'Configuración creada' });
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