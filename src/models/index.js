const { sequelize } = require('../config/db');

const Hotel = require('./Hotel');
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

const models = {
  Hotel,
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
};

let associationsApplied = false;

function applyAssociations() {
  if (associationsApplied) return;

  /*
  |--------------------------------------------------------------------------
  | Hotel
  |--------------------------------------------------------------------------
  */
  Hotel.hasMany(TipoHabitacion, {
    foreignKey: 'hotel_id',
    as: 'tiposHabitacion',
  });
  TipoHabitacion.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(Habitacion, {
    foreignKey: 'hotel_id',
    as: 'habitaciones',
  });
  Habitacion.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(Reserva, {
    foreignKey: 'hotel_id',
    as: 'reservas',
  });
  Reserva.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(Servicio, {
    foreignKey: 'hotel_id',
    as: 'servicios',
  });
  Servicio.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(Temporada, {
    foreignKey: 'hotel_id',
    as: 'temporadas',
  });
  Temporada.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(TarifaHabitacion, {
    foreignKey: 'hotel_id',
    as: 'tarifasHabitacion',
  });
  TarifaHabitacion.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  Hotel.hasMany(User, {
    foreignKey: 'hotel_id',
    as: 'usuarios',
  });
  User.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

  /*
  |--------------------------------------------------------------------------
  | TipoHabitacion
  |--------------------------------------------------------------------------
  */
  TipoHabitacion.hasMany(Habitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'habitaciones',
  });
  Habitacion.belongsTo(TipoHabitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'tipoHabitacion',
  });

  TipoHabitacion.hasMany(TarifaHabitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'tarifas',
  });
  TarifaHabitacion.belongsTo(TipoHabitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'tipoHabitacion',
  });

  /*
  |--------------------------------------------------------------------------
  | Cliente
  |--------------------------------------------------------------------------
  */
  Cliente.hasMany(Reserva, {
    foreignKey: 'cliente_id',
    as: 'reservas',
  });
  Reserva.belongsTo(Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente',
  });

  /*
  |--------------------------------------------------------------------------
  | Reserva
  |--------------------------------------------------------------------------
  */
  Reserva.hasMany(Pago, {
    foreignKey: 'reserva_id',
    as: 'pagos',
  });
  Pago.belongsTo(Reserva, {
    foreignKey: 'reserva_id',
    as: 'reserva',
  });

  Reserva.hasMany(DetalleReserva, {
    foreignKey: 'reserva_id',
    as: 'detalles',
  });
  DetalleReserva.belongsTo(Reserva, {
    foreignKey: 'reserva_id',
    as: 'reserva',
  });

  Reserva.hasMany(ServicioReserva, {
    foreignKey: 'reserva_id',
    as: 'servicios',
  });
  ServicioReserva.belongsTo(Reserva, {
    foreignKey: 'reserva_id',
    as: 'reserva',
  });

  Reserva.hasOne(Valoracion, {
    foreignKey: 'reserva_id',
    as: 'valoracion',
  });
  Valoracion.belongsTo(Reserva, {
    foreignKey: 'reserva_id',
    as: 'reserva',
  });

  /*
  |--------------------------------------------------------------------------
  | Habitacion
  |--------------------------------------------------------------------------
  */
  Habitacion.hasMany(DetalleReserva, {
    foreignKey: 'habitacion_id',
    as: 'detallesReserva',
  });
  DetalleReserva.belongsTo(Habitacion, {
    foreignKey: 'habitacion_id',
    as: 'habitacion',
  });

  Habitacion.hasMany(BloqueoHabitacion, {
    foreignKey: 'habitacion_id',
    as: 'bloqueos',
  });
  BloqueoHabitacion.belongsTo(Habitacion, {
    foreignKey: 'habitacion_id',
    as: 'habitacion',
  });

  /*
  |--------------------------------------------------------------------------
  | Temporada
  |--------------------------------------------------------------------------
  */
  Temporada.hasMany(TarifaHabitacion, {
    foreignKey: 'temporada_id',
    as: 'tarifasHabitacion',
  });
  TarifaHabitacion.belongsTo(Temporada, {
    foreignKey: 'temporada_id',
    as: 'temporada',
  });

  /*
  |--------------------------------------------------------------------------
  | Servicio
  |--------------------------------------------------------------------------
  */
  Servicio.hasMany(ServicioReserva, {
    foreignKey: 'servicio_id',
    as: 'reservasServicio',
  });
  ServicioReserva.belongsTo(Servicio, {
    foreignKey: 'servicio_id',
    as: 'servicio',
  });

  /*
  |--------------------------------------------------------------------------
  | User / AuditLog
  |--------------------------------------------------------------------------
  */
  User.hasMany(AuditLog, {
    foreignKey: 'user_id',
    as: 'logsAuditoria',
  });
  AuditLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'usuario',
  });

  associationsApplied = true;
}

async function syncModels() {
  applyAssociations();
  await sequelize.sync({ alter: false });
}

module.exports = {
  sequelize,
  models,
  Hotel,
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
  applyAssociations,
  syncModels,
};