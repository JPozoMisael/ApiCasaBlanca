const { models } = require('../models');
const { Op } = require('sequelize');

const listar = () => models.Cliente.findAll({ order: [['id', 'DESC']] });

const obtenerPorId = (id) => models.Cliente.findByPk(id);

const buscar = (q) => {
  const like = `%${q}%`;
  return models.Cliente.findAll({
    where: {
      [Op.or]: [
        { nombre: { [Op.like]: like } },
        { apellido: { [Op.like]: like } },
        { email: { [Op.like]: like } },
        { documento_identidad: { [Op.like]: like } },
      ],
    },
    order: [['id', 'DESC']],
  });
};

const crear = (data) => models.Cliente.create(data);

const actualizar = async (id, data) => {
  const c = await models.Cliente.findByPk(id);
  if (!c) return null;
  return c.update(data);
};

const eliminar = async (id) => {
  const c = await models.Cliente.findByPk(id);
  if (!c) return false;
  await c.destroy();
  return true;
};

module.exports = { listar, obtenerPorId, buscar, crear, actualizar, eliminar };
