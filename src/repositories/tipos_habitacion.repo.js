const { models } = require('../models');

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.hotel_id) where.hotel_id = filtros.hotel_id;

  return models.TipoHabitacion.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

const obtenerPorId = (id) => models.TipoHabitacion.findByPk(id);

const crear = (data) => models.TipoHabitacion.create(data);

const actualizar = async (id, data) => {
  const tipo = await models.TipoHabitacion.findByPk(id);
  if (!tipo) return null;
  return tipo.update(data);
};

const eliminar = async (id) => {
  const tipo = await models.TipoHabitacion.findByPk(id);
  if (!tipo) return false;
  await tipo.destroy();
  return true;
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
