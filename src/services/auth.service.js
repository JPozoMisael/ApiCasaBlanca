const { models } = require('../models');
const { generarToken } = require('../utils/tokens');

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('Email y password son requeridos');
    err.statusCode = 400;
    throw err;
  }

  // Normalizar email
  const emailNorm = String(email).trim().toLowerCase();

  // OJO: User tiene defaultScope sin password, por eso usamos withPassword
  const user = await models.User.scope('withPassword').findOne({
    where: { email: emailNorm },
  });

  // Evita dar pistas si existe o no existe
  if (!user) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  if (!user.esta_activo) {
    const err = new Error('Usuario inactivo');
    err.statusCode = 403;
    throw err;
  }

  const valido = await user.comparePassword(password);
  if (!valido) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  await user.update({ ultimo_login: new Date() });

  // Generar token desde utils/tokens.js
  const token = generarToken(
    { id: user.id, rol: user.rol },
    process.env.JWT_EXPIRE || '8h'
  );

  // Retornar usuario seguro (defaultScope excluye password)
  const usuarioSeguro = await models.User.findByPk(user.id);

  return { token, usuario: usuarioSeguro };
}

module.exports = { login };
