const { sequelize } = require('../config/db');

const Hotel = require('./Hotel');
const Zona = require('./Zona');
const Amenidad = require('./Amenidad');
const HotelAmenidad = require('./HotelAmenidad');
const TipoHabitacionAmenidad = require('./TipoHabitacionAmenidad');
const Imagen = require('./Imagen');
const Favorito = require('./Favorito');
const TipoHabitacion = require('./TipoHabitacion');
const Habitacion = require('./Habitacion');
const Cliente = require('./Cliente');
const Reserva = require('./Reserva');
const Pago = require('./Pago');
const DetalleReserva = require('./DetalleReserva');
const BloqueoHabitacion = require('./BloqueoHabitacion');
const AuditLog = require('./AuditLog');
const TarifaHabitacion = require('./TarifaHabitacion');
const Servicio = require('./Servicio');
const ServicioReserva = require('./ServicioReserva');
const Temporada = require('./Temporada');
const User = require('./User');
const Valoracion = require('./Valoracion');
const Configuracion = require('./Configuracion');
const Rol = require('./Rol');
const Permiso = require('./Permiso');
const RolPermiso = require('./RolPermiso');
const MenuItem = require('./MenuItem');
const CanalConexion = require('./CanalConexion');
const CanalMapeo = require('./CanalMapeo');
const CanalInventario = require('./CanalInventario');
const CanalMensaje = require('./CanalMensaje');
const CanalSalida = require('./CanalSalida');

const models = {
  Hotel,
  Zona,
  Amenidad,
  HotelAmenidad,
  TipoHabitacionAmenidad,
  Imagen,
  Favorito,
  TipoHabitacion,
  Habitacion,
  Cliente,
  Reserva,
  Pago,
  DetalleReserva,
  BloqueoHabitacion,
  AuditLog,
  TarifaHabitacion,
  Servicio,
  ServicioReserva,
  Temporada,
  User,
  Valoracion,
  Configuracion,
  Rol,
  Permiso,
  RolPermiso,
  MenuItem,
  CanalConexion,
  CanalMapeo,
  CanalInventario,
  CanalMensaje,
  CanalSalida,
};

let associationsApplied = false;

function applyAssociations() {
  if (associationsApplied) return;

  // ================= ZONA =================
  Zona.hasMany(Hotel, { foreignKey: 'zona_id', as: 'hoteles' });
  Hotel.belongsTo(Zona, { foreignKey: 'zona_id', as: 'zona' });

  // ================= HOTEL =================
  Hotel.hasMany(TipoHabitacion, { foreignKey: 'hotel_id', as: 'tiposHabitacion' });
  TipoHabitacion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Habitacion, { foreignKey: 'hotel_id', as: 'habitaciones' });
  Habitacion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Reserva, { foreignKey: 'hotel_id', as: 'reservas' });
  Reserva.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Servicio, { foreignKey: 'hotel_id', as: 'servicios' });
  Servicio.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Temporada, { foreignKey: 'hotel_id', as: 'temporadas' });
  Temporada.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(TarifaHabitacion, { foreignKey: 'hotel_id', as: 'tarifasHabitacion' });
  TarifaHabitacion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(User, { foreignKey: 'hotel_id', as: 'usuarios' });
  User.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Configuracion, { foreignKey: 'hotel_id', as: 'configuraciones' });
  Configuracion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Valoracion, { foreignKey: 'hotel_id', as: 'valoraciones' });
  Valoracion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  Hotel.hasMany(Imagen, { foreignKey: 'hotel_id', as: 'imagenes' });
  Imagen.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  // ================= AMENIDADES =================
  Hotel.belongsToMany(Amenidad, {
    through: HotelAmenidad,
    foreignKey: 'hotel_id',
    otherKey: 'amenidad_id',
    as: 'amenidades',
  });
  Amenidad.belongsToMany(Hotel, {
    through: HotelAmenidad,
    foreignKey: 'amenidad_id',
    otherKey: 'hotel_id',
    as: 'hoteles',
  });

  TipoHabitacion.belongsToMany(Amenidad, {
    through: TipoHabitacionAmenidad,
    foreignKey: 'tipo_habitacion_id',
    otherKey: 'amenidad_id',
    as: 'amenidades',
  });
  Amenidad.belongsToMany(TipoHabitacion, {
    through: TipoHabitacionAmenidad,
    foreignKey: 'amenidad_id',
    otherKey: 'tipo_habitacion_id',
    as: 'tiposHabitacion',
  });

  // ================= TIPO HABITACIÓN =================
  TipoHabitacion.hasMany(Habitacion, { foreignKey: 'tipo_habitacion_id', as: 'habitaciones' });
  Habitacion.belongsTo(TipoHabitacion, { foreignKey: 'tipo_habitacion_id', as: 'tipoHabitacion' });

  TipoHabitacion.hasMany(TarifaHabitacion, { foreignKey: 'tipo_habitacion_id', as: 'tarifas' });
  TarifaHabitacion.belongsTo(TipoHabitacion, { foreignKey: 'tipo_habitacion_id', as: 'tipoHabitacion' });

  TipoHabitacion.hasMany(Imagen, { foreignKey: 'tipo_habitacion_id', as: 'imagenes' });
  Imagen.belongsTo(TipoHabitacion, { foreignKey: 'tipo_habitacion_id', as: 'tipoHabitacion' });

  // ================= USUARIO / CLIENTE =================
  User.hasOne(Cliente, { foreignKey: 'user_id', as: 'perfilCliente' });
  Cliente.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

  User.hasMany(Reserva, { foreignKey: 'user_id', as: 'reservas' });
  Reserva.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

  User.hasMany(Favorito, { foreignKey: 'user_id', as: 'favoritos' });
  Favorito.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });
  Hotel.hasMany(Favorito, { foreignKey: 'hotel_id', as: 'favoritos' });
  Favorito.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

  User.hasMany(Valoracion, { foreignKey: 'user_id', as: 'valoraciones' });
  Valoracion.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

  // ================= CLIENTE =================
  Cliente.hasMany(Reserva, { foreignKey: 'cliente_id', as: 'reservas' });
  Reserva.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

  // ================= RESERVA =================
  Reserva.hasMany(Pago, { foreignKey: 'reserva_id', as: 'pagos' });
  Pago.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });

  Reserva.hasMany(DetalleReserva, { foreignKey: 'reserva_id', as: 'detalles' });
  DetalleReserva.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });

  Reserva.hasMany(ServicioReserva, { foreignKey: 'reserva_id', as: 'servicios' });
  ServicioReserva.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });

  Reserva.hasOne(Valoracion, { foreignKey: 'reserva_id', as: 'valoracion' });
  Valoracion.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });

  // ================= HABITACIÓN =================
  Habitacion.hasMany(DetalleReserva, { foreignKey: 'habitacion_id', as: 'detallesReserva' });
  DetalleReserva.belongsTo(Habitacion, { foreignKey: 'habitacion_id', as: 'habitacion' });

  Habitacion.hasMany(BloqueoHabitacion, { foreignKey: 'habitacion_id', as: 'bloqueos' });
  BloqueoHabitacion.belongsTo(Habitacion, { foreignKey: 'habitacion_id', as: 'habitacion' });

  // ================= TEMPORADA =================
  Temporada.hasMany(TarifaHabitacion, { foreignKey: 'temporada_id', as: 'tarifasHabitacion' });
  TarifaHabitacion.belongsTo(Temporada, { foreignKey: 'temporada_id', as: 'temporada' });

  // ================= SERVICIO =================
  Servicio.hasMany(ServicioReserva, { foreignKey: 'servicio_id', as: 'reservasServicio' });
  ServicioReserva.belongsTo(Servicio, { foreignKey: 'servicio_id', as: 'servicio' });

  // ================= AUDITORÍA =================
  User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'logsAuditoria' });
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

  // ================= RBAC =================
  Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
  Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });
  MenuItem.belongsTo(Permiso, { foreignKey: 'permiso_id', as: 'permiso' });
  Permiso.hasMany(MenuItem, { foreignKey: 'permiso_id', as: 'opcionesMenu' });

  // ================= CANALES (channel manager) =================
  Hotel.hasMany(CanalConexion, { foreignKey: 'hotel_id', as: 'conexionesCanal' });
  CanalConexion.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });
  CanalConexion.hasMany(CanalMapeo, { foreignKey: 'conexion_id', as: 'mapeos' });
  CanalMapeo.belongsTo(CanalConexion, { foreignKey: 'conexion_id', as: 'conexion' });
  CanalMapeo.belongsTo(TipoHabitacion, { foreignKey: 'tipo_habitacion_id', as: 'tipoHabitacion' });
  CanalConexion.hasMany(CanalInventario, { foreignKey: 'conexion_id', as: 'inventario' });
  CanalConexion.hasMany(CanalSalida, { foreignKey: 'conexion_id', as: 'salidas' });
  CanalSalida.belongsTo(CanalConexion, { foreignKey: 'conexion_id', as: 'conexion' });
  CanalSalida.belongsTo(Reserva, { foreignKey: 'reserva_id', as: 'reserva' });
  CanalMensaje.belongsTo(CanalConexion, { foreignKey: 'conexion_id', as: 'conexion' });

  associationsApplied = true;
}

async function syncModels(options = {}) {
  applyAssociations();
  await sequelize.sync(options);
}

module.exports = {
  sequelize,
  models,
  ...models,
  applyAssociations,
  syncModels,
};
