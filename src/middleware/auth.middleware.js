const { extraerBearerToken, verificarToken } = require('../utils/tokens');
const { AppError } = require('../utils/errors');
const { models } = require('../models');
const rbac = require('../services/rbac.service');

async function cargarUsuario(req) {
  const token = extraerBearerToken(req.headers.authorization || '');
  if (!token) return null;

  const payload = verificarToken(token); // lanza 401 si es inválido/expirado
  if (!payload?.id) throw new AppError('Token inválido', 401);

  // Se relee el usuario: un rol/hotel cambiado o un usuario desactivado surte efecto de inmediato.
  const user = await models.User.findByPk(payload.id);
  if (!user || user.estado !== 'activo') throw new AppError('Sesión no válida', 401, 'SESION_INVALIDA');

  const acceso = await rbac.accesoDe(user.rol);

  return {
    id: user.id,
    rol: user.rol,
    alcance: acceso.alcance,
    permisos: acceso.permisos,
    hotel_id: user.hotel_id,
    nombre: user.nombre,
    email: user.email,
  };
}

// Exige sesión.
async function auth(req, res, next) {
  try {
    const user = await cargarUsuario(req);
    if (!user) return next(new AppError('No autorizado: token faltante', 401));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Sesión opcional: rutas públicas que se comportan distinto si hay usuario (p. ej. reservar).
async function authOpcional(req, res, next) {
  try {
    req.user = (await cargarUsuario(req)) || null;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { auth, authOpcional };
