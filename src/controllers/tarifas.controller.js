const { TarifaHabitacion, Hotel, TipoHabitacion, Temporada } = require('../models');

// Listar todas las tarifas
async function listar(req, res, next) {
  try {
    const tarifas = await TarifaHabitacion.findAll({
      include: [
        { model: Hotel, as: 'hotel', attributes: ['id', 'nombre'] },
        { model: TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre', 'capacidad_maxima'] },
        { model: Temporada, as: 'temporada', attributes: ['id', 'nombre', 'tipo'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ ok: true, data: tarifas });
  } catch (error) {
    next(error);
  }
}

// Obtener tarifa por ID
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;
    const tarifa = await TarifaHabitacion.findByPk(id, {
      include: [
        { model: Hotel, as: 'hotel' },
        { model: TipoHabitacion, as: 'tipoHabitacion' },
        { model: Temporada, as: 'temporada' },
      ],
    });
    if (!tarifa) {
      return res.status(404).json({ ok: false, message: 'Tarifa no encontrada' });
    }
    res.json({ ok: true, data: tarifa });
  } catch (error) {
    next(error);
  }
}

// Crear tarifa
async function crear(req, res, next) {
  try {
    const { hotel_id, tipo_habitacion_id, temporada_id, tipo_dia, precio } = req.body;
    
    if (!hotel_id || !tipo_habitacion_id || !temporada_id || !precio) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
    }
    
    const tarifa = await TarifaHabitacion.create({
      hotel_id,
      tipo_habitacion_id,
      temporada_id,
      tipo_dia: tipo_dia || 'entre_semana',
      precio,
    });
    
    res.status(201).json({ ok: true, data: tarifa, message: 'Tarifa creada correctamente' });
  } catch (error) {
    next(error);
  }
}

// Actualizar tarifa
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const tarifa = await TarifaHabitacion.findByPk(id);
    
    if (!tarifa) {
      return res.status(404).json({ ok: false, message: 'Tarifa no encontrada' });
    }
    
    await tarifa.update(req.body);
    res.json({ ok: true, data: tarifa, message: 'Tarifa actualizada correctamente' });
  } catch (error) {
    next(error);
  }
}

// Eliminar tarifa
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;
    const tarifa = await TarifaHabitacion.findByPk(id);
    
    if (!tarifa) {
      return res.status(404).json({ ok: false, message: 'Tarifa no encontrada' });
    }
    
    await tarifa.destroy();
    res.json({ ok: true, message: 'Tarifa eliminada correctamente' });
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