const { models } = require('../models');

const listarUsuarios = () =>
  models.User.findAll({
    attributes: { exclude: ['password'] },
    order: [['id', 'DESC']],
  });

const obtenerUsuarioPorId = (id) =>
  models.User.findByPk(id, { attributes: { exclude: ['password'] } });

const crearUsuario = (data) => models.User.create(data);

const cambiarRol = async (id, rol) => {
  const u = await models.User.findByPk(id);
  if (!u) return null;
  return u.update({ rol });
};

module.exports = { listarUsuarios, obtenerUsuarioPorId, crearUsuario, cambiarRol };
