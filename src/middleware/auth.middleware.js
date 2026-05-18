const {
  extraerBearerToken,
  verificarToken,
} = require('../utils/tokens');


// =========================================
// AUTH MIDDLEWARE
// =========================================

module.exports = function auth(
  req,
  res,
  next
) {

  try {

    // =====================================
    // EXTRAER TOKEN
    // =====================================

    const authHeader =
      req.headers.authorization || '';

    const token =
      extraerBearerToken(authHeader);


    // =====================================
    // VALIDAR TOKEN EXISTENTE
    // =====================================

    if (!token) {

      return res.status(401).json({
        ok: false,
        message:
          'No autorizado: token faltante',
      });
    }


    // =====================================
    // VERIFICAR JWT
    // =====================================

    const payload =
      verificarToken(token);


    // =====================================
    // VALIDAR PAYLOAD
    // =====================================

    if (
      !payload ||
      !payload.id ||
      !payload.rol
    ) {

      return res.status(401).json({
        ok: false,
        message: 'Token inválido',
      });
    }


    // =====================================
    // NORMALIZAR USER
    // =====================================

    req.user = {
      id: Number(payload.id),

      rol: String(payload.rol)
        .trim()
        .toLowerCase(),
    };


    // =====================================
    // CONTINUAR
    // =====================================

    next();

  } catch (error) {

    console.error(
      'Error auth middleware:',
      error.message
    );

    return res.status(401).json({
      ok: false,
      message:
        'No autorizado: token inválido o expirado',
    });
  }
};