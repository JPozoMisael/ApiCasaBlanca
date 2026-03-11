const { models } = require('../models');

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.hotel_id) where.hotel_id = filtros.hotel_id;
  if (filtros.tipo_habitacion_id) where.tipo_habitacion_id = filtros.tipo_habitacion_id;
  if (filtros.estado) where.estado = filtros.estado;

  return models.Habitacion.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

const obtenerPorId = (id) => models.Habitacion.findByPk(id);

const crear = (data) => models.Habitacion.create(data);

const actualizar = async (id, data) => {
  const hab = await models.Habitacion.findByPk(id);
  if (!hab) return null;
  return hab.update(data);
};

const eliminar = async (id) => {
  const hab = await models.Habitacion.findByPk(id);
  if (!hab) return false;
  await hab.destroy();
  return true;
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
