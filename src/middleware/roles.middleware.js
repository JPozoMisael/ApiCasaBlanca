module.exports = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rol;

    if (!rol) {
      return res.status(401).json({ ok: false, message: 'No autorizado' });
    }

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ ok: false, message: 'Acceso denegado: rol insuficiente' });
    }

    next();
  };
};
