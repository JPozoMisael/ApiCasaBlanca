const { models } = require('../models');

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.hotel_id) where.hotel_id = filtros.hotel_id;
  if (typeof filtros.esta_activo !== 'undefined') where.esta_activo = filtros.esta_activo;

  return models.Servicio.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

const obtenerPorId = (id) => models.Servicio.findByPk(id);

const crear = (data) => models.Servicio.create(data);

const actualizar = async (id, data) => {
  const s = await models.Servicio.findByPk(id);
  if (!s) return null;
  return s.update(data);
};

const eliminar = async (id) => {
  const s = await models.Servicio.findByPk(id);
  if (!s) return false;
  await s.destroy();
  return true;
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
