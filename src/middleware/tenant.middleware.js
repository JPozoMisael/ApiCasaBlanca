const { AppError } = require('../utils/errors');

/*
| Aislamiento multi-hotel.
|   - admin / recepcion: quedan atados al hotel de su cuenta; cualquier hotel_id que envíen se ignora.
|   - super_admin: puede operar sobre cualquier hotel indicándolo en ?hotel_id= , body.hotel_id o header x-hotel-id.
|     Sin indicar hotel, las lecturas abarcan toda la plataforma.
| Debe ir DESPUÉS de auth.
*/
function tenant(req, res, next) {
  const user = req.user;
  if (!user) return next(new AppError('No autenticado', 401));

  if (user.alcance === 'cliente') {
    return next(new AppError('Acceso denegado: permisos insuficientes', 403, 'PERMISOS_INSUFICIENTES'));
  }

  req.esSuperAdmin = user.alcance === 'plataforma';

  if (req.esSuperAdmin) {
    const pedido = req.query.hotel_id ?? req.body?.hotel_id ?? req.headers['x-hotel-id'];
    const id = pedido === undefined || pedido === '' ? null : Number(pedido);
    if (id !== null && (!Number.isInteger(id) || id < 1)) {
      return next(new AppError('hotel_id inválido', 400));
    }
    req.hotelId = id;
  } else {
    if (!user.hotel_id) {
      return next(new AppError('Tu cuenta no está asociada a ningún hotel', 403, 'SIN_HOTEL'));
    }
    req.hotelId = Number(user.hotel_id);
  }

  next();
}

// Filtro WHERE para consultas: {} para super_admin sin hotel elegido.
const filtroHotel = (req) => (req.hotelId ? { hotel_id: req.hotelId } : {});

// Para operaciones de escritura: el hotel es obligatorio.
function hotelObligatorio(req) {
  if (!req.hotelId) {
    throw new AppError('Indica el hotel (hotel_id) sobre el que operar', 400, 'HOTEL_REQUERIDO');
  }
  return req.hotelId;
}

// Verifica que un registro cargado pertenece al hotel del solicitante; 404 si no (no revela existencia).
function verificarPertenencia(req, registro) {
  if (!registro) throw new AppError('Recurso no encontrado', 404);
  if (req.hotelId && registro.hotel_id !== req.hotelId) throw new AppError('Recurso no encontrado', 404);
  return registro;
}

module.exports = { tenant, filtroHotel, hotelObligatorio, verificarPertenencia };
