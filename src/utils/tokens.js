const jwt = require('jsonwebtoken');

function getSecret() {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET no configurado');
    err.statusCode = 500;
    throw err;
  }
  return process.env.JWT_SECRET;
}

function generarToken(payload, expiresIn = '8h') {
  if (!payload || typeof payload !== 'object') {
    const err = new Error('Payload inválido para JWT');
    err.statusCode = 400;
    throw err;
  }

  return jwt.sign(payload, getSecret(), { expiresIn });
}

function verificarToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (error) {
    const err = new Error('Token inválido o expirado');
    err.statusCode = 401;
    throw err;
  }
}

function extraerBearerToken(authorizationHeader = '') {
  if (!authorizationHeader) return null;

  const parts = authorizationHeader.split(' ');

  if (parts.length !== 2) return null;

  const [type, token] = parts;

  if (type !== 'Bearer' || !token) return null;

  return token;
}

module.exports = {
  generarToken,
  verificarToken,
  extraerBearerToken,
};