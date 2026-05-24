const {
  extraerBearerToken,
  verificarToken,
} = require('../utils/tokens');

// =========================================
// MIDDLEWARE PRINCIPAL
// =========================================
function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = extraerBearerToken(authHeader);

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'No autorizado: token faltante',
      });
    }

    const payload = verificarToken(token);

    if (!payload || !payload.id || !payload.rol) {
      return res.status(401).json({
        ok: false,
        message: 'Token inválido',
      });
    }

    req.user = {
      id: Number(payload.id),
      rol: String(payload.rol).trim().toLowerCase(),
    };

    next();
  } catch (error) {
    console.error('Error auth middleware:', error.message);
    return res.status(401).json({
      ok: false,
      message: 'No autorizado: token inválido o expirado',
    });
  }
}

// =========================================
// VERIFICAR ROL ESPECÍFICO
// =========================================
const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: 'No autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        message: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};

// =========================================
// VERIFICAR ADMIN
// =========================================
const verificarAdmin = (req, res, next) => {
  if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'super_admin')) {
    return res.status(403).json({
      ok: false,
      message: 'Acceso denegado. Se requiere rol de administrador'
    });
  }
  next();
};

// =========================================
// VERIFICAR SUPER ADMIN
// =========================================
const verificarSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== 'super_admin') {
    return res.status(403).json({
      ok: false,
      message: 'Acceso denegado. Se requiere rol de super administrador'
    });
  }
  next();
};

// =========================================
// EXPORTS
// =========================================
module.exports = {
  auth,
  verificarRol,
  verificarAdmin,
  verificarSuperAdmin
};