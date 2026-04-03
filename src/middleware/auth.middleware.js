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

    //  Validación fuerte
    if (!payload?.id || !payload?.rol) {
      return res.status(401).json({
        ok: false,
        message: 'Token inválido',
      });
    }

    req.user = payload;

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      message: 'No autorizado: token inválido o expirado',
    });
  }
};