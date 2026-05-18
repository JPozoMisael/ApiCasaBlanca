function permitirRoles(...rolesPermitidos) {

  return (req, res, next) => {

    // =====================================
    // VALIDAR USUARIO AUTENTICADO
    // =====================================

    if (!req.user) {

      return res.status(401).json({
        ok: false,
        message: 'No autenticado',
      });
    }


    // =====================================
    // OBTENER ROL
    // =====================================

    const rolUsuario = String(
      req.user.rol || ''
    )
      .trim()
      .toLowerCase();


    // =====================================
    // VALIDAR QUE EXISTA ROL
    // =====================================

    if (!rolUsuario) {

      return res.status(401).json({
        ok: false,
        message: 'Rol no definido',
      });
    }


    // =====================================
    // NORMALIZAR ROLES PERMITIDOS
    // =====================================

    const rolesValidos =
      rolesPermitidos.map((rol) =>
        String(rol)
          .trim()
          .toLowerCase()
      );


    // =====================================
    // VALIDAR ACCESO
    // =====================================

    if (!rolesValidos.includes(rolUsuario)) {

      return res.status(403).json({
        ok: false,
        message:
          'Acceso denegado: permisos insuficientes',
      });
    }


    // =====================================
    // CONTINUAR
    // =====================================

    next();
  };
}


module.exports = {
  permitirRoles,
};