const { AppError } = require('../utils/errors');

/*
| Autorización por PERMISOS (definidos en la base de datos), no por nombre de rol.
|   permiso('reservas.gestionar')            → requiere ese permiso
|   permiso('pagos.ver', 'pagos.registrar')  → basta con tener alguno
|
| - El alcance "plataforma" tiene acceso total, salvo que las claves `plataforma.*` SOLO las
|   puede usar un rol de alcance plataforma (aunque a un rol de hotel se le asignara por error).
| - Un rol desconocido no tiene permisos: se falla cerrado.
| Debe ir DESPUÉS de auth.
*/
function permiso(...claves) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return next(new AppError('No autenticado', 401));

    if (user.alcance === 'plataforma') return next();

    const soloPlataforma = claves.every((c) => c.startsWith('plataforma.'));
    if (soloPlataforma || user.alcance === 'cliente') {
      return next(new AppError('Acceso denegado: permisos insuficientes', 403, 'PERMISOS_INSUFICIENTES'));
    }

    const permitido = claves.filter((c) => !c.startsWith('plataforma.')).some((c) => user.permisos.has(c));
    if (!permitido) {
      return next(new AppError('Acceso denegado: permisos insuficientes', 403, 'PERMISOS_INSUFICIENTES'));
    }
    next();
  };
}

const tienePermiso = (user, clave) =>
  Boolean(user) && (user.alcance === 'plataforma' || (user.alcance !== 'cliente' && user.permisos.has(clave)));

module.exports = { permiso, tienePermiso };
