const { models } = require('../models');

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.hotel_id) where.hotel_id = filtros.hotel_id;
  if (filtros.cliente_id) where.cliente_id = filtros.cliente_id;
  if (filtros.estado) where.estado = filtros.estado;

  return models.Reserva.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

const obtenerPorId = (id) => models.Reserva.findByPk(id);

const crear = (data, options = {}) => models.Reserva.create(data, options);

const actualizar = async (id, data) => {
  const r = await models.Reserva.findByPk(id);
  if (!r) return null;
  return r.update(data);
};

const cancelar = async (id) => {
  const r = await models.Reserva.findByPk(id);
  if (!r) return null;
  return r.update({ estado: 'cancelada' });
};

module.exports = { listar, obtenerPorId, crear, actualizar, cancelar };
