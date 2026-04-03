module.exports = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rol;

    if (!rol) {
      return res.status(401).json({
        ok: false,
        message: 'No autorizado',
      });
    }

    //  Mejora: normalización de rol (evita bugs tipo "Admin" vs "admin")
    const rolNormalizado = String(rol).toLowerCase();

    const rolesValidos = rolesPermitidos.map(r => String(r).toLowerCase());

    if (!rolesValidos.includes(rolNormalizado)) {
      return res.status(403).json({
        ok: false,
        message: 'Acceso denegado: rol insuficiente',
      });
    }

    next();
  };
};