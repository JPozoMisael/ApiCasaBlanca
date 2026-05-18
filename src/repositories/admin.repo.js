const { models } = require('../models');


// =========================================
// LISTAR USUARIOS
// =========================================

const listarUsuarios = () => {

  return models.User.findAll({

    attributes: {
      exclude: ['password'],
    },

    order: [['id', 'DESC']],
  });
};


// =========================================
// OBTENER USUARIO POR ID
// =========================================

const obtenerUsuarioPorId = (id) => {

  return models.User.findByPk(id, {

    attributes: {
      exclude: ['password'],
    },
  });
};


// =========================================
// OBTENER USUARIO POR EMAIL
// =========================================

const obtenerUsuarioPorEmail = (email) => {

  return models.User.findOne({

    where: { email },
  });
};


// =========================================
// CREAR USUARIO
// =========================================

const crearUsuario = (data) => {

  return models.User.create(data);
};


// =========================================
// CAMBIAR ROL
// =========================================

const cambiarRol = async (
  id,
  rol
) => {

  const usuario =
    await models.User.findByPk(id);


  if (!usuario) {
    return null;
  }


  await usuario.update({ rol });


  return usuario;
};


// =========================================
// CAMBIAR ESTADO
// =========================================

const cambiarEstado = async (
  id,
  estado
) => {

  const usuario =
    await models.User.findByPk(id);


  if (!usuario) {
    return null;
  }


  await usuario.update({ estado });


  return usuario;
};


// =========================================
// ELIMINAR USUARIO
// =========================================

const eliminarUsuario = async (id) => {

  const usuario =
    await models.User.findByPk(id);


  if (!usuario) {
    return null;
  }


  await usuario.destroy();


  return true;
};


module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  obtenerUsuarioPorEmail,
  crearUsuario,
  cambiarRol,
  cambiarEstado,
  eliminarUsuario,
};