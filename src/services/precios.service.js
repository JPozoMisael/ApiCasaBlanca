const { Op } = require('sequelize');
const { models } = require('../models');

async function obtenerPrecioNoche({ tipo_habitacion_id, fecha }) {
  // Buscar un precio activo cuyo rango contenga la fecha
  const precio = await models.PrecioHabitacion.findOne({
    where: {
      tipo_habitacion_id,
      estado: 'activo',
      fecha_inicio: { [Op.lte]: fecha },
      fecha_fin: { [Op.gte]: fecha },
    },
    order: [['id', 'DESC']],
  });

  if (precio) return Number(precio.precio);

  const tipo = await models.TipoHabitacion.findByPk(tipo_habitacion_id);
  if (!tipo) {
    const err = new Error('Tipo de habitación no existe');
    err.statusCode = 404;
    throw err;
  }

  return Number(tipo.precio_base);
}

module.exports = { obtenerPrecioNoche };
