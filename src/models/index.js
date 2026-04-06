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

  // ================= TIPO HABITACIÓN =================
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

  // ================= 🔥 RELACIÓN N:M (IMPORTANTE) =================
  Reserva.belongsToMany(Servicio, {
    through: ServicioReserva,
    foreignKey: 'reserva_id',
    otherKey: 'servicio_id',
    as: 'serviciosIncluidos',
  });

  Servicio.belongsToMany(Reserva, {
    through: ServicioReserva,
    foreignKey: 'servicio_id',
    otherKey: 'reserva_id',
    as: 'reservas',
  });

  // ================= HABITACIÓN =================
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

  // ================= TEMPORADA =================
  Temporada.hasMany(TarifaHabitacion, {
    foreignKey: 'temporada_id',
    as: 'tarifasHabitacion',
  });
  TarifaHabitacion.belongsTo(Temporada, {
    foreignKey: 'temporada_id',
    as: 'temporada',
  });

  // ================= SERVICIO =================
  Servicio.hasMany(ServicioReserva, {
    foreignKey: 'servicio_id',
    as: 'reservasServicio',
  });
  ServicioReserva.belongsTo(Servicio, {
    foreignKey: 'servicio_id',
    as: 'servicio',
  });

  // ================= AUDITORÍA =================
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
  ...models,
  applyAssociations,
  syncModels,
};