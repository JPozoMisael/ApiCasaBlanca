const { models } = require('../models');
const { generarToken } = require('../utils/tokens');
const { AppError } = require('../utils/errors');
const rbac = require('./rbac.service');

const credencialesInvalidas = () => new AppError('Credenciales inválidas', 401, 'CREDENCIALES_INVALIDAS');

function serializarUsuario(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    rol: user.rol,
    hotel_id: user.hotel_id ?? null,
    estado: user.estado,
    ultimo_login: user.ultimo_login,
  };
}

async function login({ email, password }) {
  const user = await models.User.scope('withPassword').findOne({
    where: { email: String(email).trim().toLowerCase() },
  });

  // Mismo mensaje para usuario inexistente y contraseña errónea: no revelar cuentas.
  if (!user) throw credencialesInvalidas();
  if (!(await user.comparePassword(password))) throw credencialesInvalidas();
  if (user.estado !== 'activo') throw new AppError('Usuario inactivo', 403, 'USUARIO_INACTIVO');

  await user.update({ ultimo_login: new Date() });

  // hotel_id viaja en el token solo como referencia; el middleware auth lo relee de la BD.
  const token = generarToken(
    { id: user.id, rol: user.rol, hotel_id: user.hotel_id },
    process.env.JWT_EXPIRE || '8h'
  );

  const { alcance } = await rbac.accesoDe(user.rol);
  return { token, usuario: { ...serializarUsuario(user), alcance } };
}

// El registro público SIEMPRE crea una cuenta de cliente.
async function register({ nombre, apellido, email, password }) {
  const emailNorm = String(email).trim().toLowerCase();
  const existe = await models.User.findOne({ where: { email: emailNorm }, attributes: ['id'] });
  if (existe) throw new AppError('Ya existe una cuenta con ese email', 409, 'EMAIL_DUPLICADO');

  const user = await models.User.create({
    nombre,
    apellido,
    email: emailNorm,
    password,
    rol: 'cliente',
    estado: 'activo',
  });

  // No se vinculan reservas previas por coincidencia de correo: sin verificación de email sería
  // una vía para apropiarse de reservas ajenas. Los invitados usan código + correo para gestionarlas.
  return serializarUsuario(user);
}

async function perfil(userId) {
  const user = await models.User.findByPk(userId, {
    include: [{ model: models.Hotel, as: 'hotel', attributes: ['id', 'nombre', 'slug'] }],
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  const { alcance } = await rbac.accesoDe(user.rol);
  return { ...serializarUsuario(user), alcance, hotel: user.hotel || null };
}

async function actualizarPerfil(userId, { nombre, apellido }) {
  const user = await models.User.findByPk(userId);
  await user.update({ ...(nombre && { nombre }), ...(apellido && { apellido }) });
  return serializarUsuario(user);
}

async function cambiarPassword(userId, { actual, nueva }) {
  const user = await models.User.scope('withPassword').findByPk(userId);
  if (!(await user.comparePassword(actual))) {
    throw new AppError('La contraseña actual es incorrecta', 400, 'PASSWORD_INCORRECTA');
  }
  await user.update({ password: nueva });
  return true;
}

module.exports = { login, register, perfil, actualizarPerfil, cambiarPassword, serializarUsuario };
