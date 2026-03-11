const { models } = require('../models');

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.reserva_id) where.reserva_id = filtros.reserva_id;
  if (filtros.estado) where.estado = filtros.estado;

  return models.Pago.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

const obtenerPorId = (id) => models.Pago.findByPk(id);

const crear = (data, options = {}) => models.Pago.create(data, options);

module.exports = { listar, obtenerPorId, crear };
