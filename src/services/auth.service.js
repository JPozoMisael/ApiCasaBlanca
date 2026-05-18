const { models } = require('../models');

const {
  generarToken
} = require('../utils/tokens');


// =========================================
// LOGIN
// =========================================

async function login({
  email,
  password
}) {

  // =====================================
  // VALIDAR DATOS
  // =====================================

  if (!email || !password) {

    const err = new Error(
      'Email y password son requeridos'
    );

    err.statusCode = 400;

    throw err;
  }


  // =====================================
  // NORMALIZAR EMAIL
  // =====================================

  const emailNorm = String(email)
    .trim()
    .toLowerCase();


  // =====================================
  // BUSCAR USUARIO
  // =====================================

  const user =
    await models.User
      .scope('withPassword')
      .findOne({
        where: {
          email: emailNorm
        },
      });


  // =====================================
  // VALIDAR USUARIO
  // =====================================

  if (!user) {

    const err = new Error(
      'Credenciales inválidas'
    );

    err.statusCode = 401;

    throw err;
  }


  // =====================================
  // VALIDAR ESTADO
  // =====================================

  if (user.estado !== 'activo') {

    const err = new Error(
      'Usuario inactivo'
    );

    err.statusCode = 403;

    throw err;
  }


  // =====================================
  // VALIDAR PASSWORD
  // =====================================

  const valido =
    await user.comparePassword(
      password
    );


  if (!valido) {

    const err = new Error(
      'Credenciales inválidas'
    );

    err.statusCode = 401;

    throw err;
  }


  // =====================================
  // ACTUALIZAR ÚLTIMO LOGIN
  // =====================================

  await user.update({
    ultimo_login: new Date()
  });


  // =====================================
  // GENERAR TOKEN
  // =====================================

  const token = generarToken(

    {
      id: user.id,
      rol: user.rol
    },

    process.env.JWT_EXPIRE || '8h'
  );


  // =====================================
  // RETORNAR USUARIO SEGURO
  // =====================================

  const usuarioSeguro =
    await models.User.findByPk(
      user.id
    );


  return {
    token,
    usuario: usuarioSeguro
  };
}


// =========================================
// REGISTER
// =========================================

async function register(data) {

  const {
    hotel_id,
    nombre,
    apellido,
    email,
    password
  } = data;


  // =====================================
  // VALIDAR DATOS
  // =====================================

  if (
    !nombre ||
    !apellido ||
    !email ||
    !password
  ) {

    const err = new Error(
      'Datos incompletos'
    );

    err.statusCode = 400;

    throw err;
  }


  // =====================================
  // NORMALIZAR EMAIL
  // =====================================

  const emailNorm = String(email)
    .trim()
    .toLowerCase();


  // =====================================
  // VALIDAR EMAIL EXISTENTE
  // =====================================

  const existe =
    await models.User.findOne({
      where: {
        email: emailNorm
      }
    });


  if (existe) {

    const err = new Error(
      'El usuario ya existe'
    );

    err.statusCode = 409;

    throw err;
  }


  // =====================================
  // REGISTER PÚBLICO
  // SIEMPRE CLIENTE
  // =====================================

  const rolFinal = 'cliente';


  // =====================================
  // CREAR USUARIO
  // =====================================

  const nuevoUsuario =
    await models.User.create({

      hotel_id:
        hotel_id || null,

      nombre,

      apellido,

      email: emailNorm,

      password,

      rol: rolFinal,

      estado: 'activo'
    });


  return nuevoUsuario;
}


module.exports = {
  login,
  register
};