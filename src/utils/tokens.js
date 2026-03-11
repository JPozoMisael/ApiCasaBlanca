// src/utils/tokens.js
const jwt = require('jsonwebtoken');

/**
 * Genera un JWT
 * @param {object} payload - { id, rol, ... }
 * @param {string} expiresIn - ej: '8h', '7d'
 */
function generarToken(payload, expiresIn = '8h') {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET no configurado');
    err.statusCode = 500;
    throw err;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

/**
 * Verifica un JWT y devuelve el payload
 */
function verificarToken(token) {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET no configurado');
    err.statusCode = 500;
    throw err;
  }

  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Extrae el token de "Authorization: Bearer <token>"
 */
function extraerBearerToken(authorizationHeader = '') {
  const [type, token] = authorizationHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

module.exports = {
  generarToken,
  verificarToken,
  extraerBearerToken,
};
