const { extraerBearerToken, verificarToken } = require('../utils/tokens');

module.exports = function auth(req, res, next) {
  try {
    const token = extraerBearerToken(req.headers.authorization || '');

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'No autorizado: token faltante',
      });
    }

    const payload = verificarToken(token);

    // payload esperado: { id, rol, iat, exp }
    req.user = payload;

    return next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      message: 'No autorizado: token inválido o expirado',
    });
  }
};
