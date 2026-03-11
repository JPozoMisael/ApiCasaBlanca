const { models } = require('../models');

const listar = () => models.Hotel.findAll({ order: [['id', 'DESC']] });

const obtenerPorId = (id) => models.Hotel.findByPk(id);

const crear = (data) => models.Hotel.create(data);

const actualizar = async (id, data) => {
  const hotel = await models.Hotel.findByPk(id);
  if (!hotel) return null;
  return hotel.update(data);
};

const eliminar = async (id) => {
  const hotel = await models.Hotel.findByPk(id);
  if (!hotel) return false;
  await hotel.destroy();
  return true;
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
