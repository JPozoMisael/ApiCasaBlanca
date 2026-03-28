const { sequelize } = require('../config/db');

const Hotel = require('./Hotel');
const TipoHabitacion = require('./TipoHabitacion');
const Habitacion = require('./Habitacion');
const Cliente = require('./Cliente');
const Reserva = require('./Reserva');
const Pago = require('./Pago');
const DetalleReserva = require('./DetalleReserva');
const BloqueoHabitacion = require('./BloqueoHabitacion');

const models = {
  Hotel,
  TipoHabitacion,
  Habitacion,
  Cliente,
  Reserva,
  Pago,
  DetalleReserva,
  BloqueoHabitacion,
};

let associationsApplied = false;

function applyAssociations() {
  if (associationsApplied) return;

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

  TipoHabitacion.hasMany(Habitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'habitaciones',
  });
  Habitacion.belongsTo(TipoHabitacion, {
    foreignKey: 'tipo_habitacion_id',
    as: 'tipoHabitacion',
  });

  Cliente.hasMany(Reserva, {
    foreignKey: 'cliente_id',
    as: 'reservas',
  });
  Reserva.belongsTo(Cliente, {
    foreignKey: 'cliente_id',
    as: 'cliente',
  });

  Hotel.hasMany(Reserva, {
    foreignKey: 'hotel_id',
    as: 'reservas',
  });
  Reserva.belongsTo(Hotel, {
    foreignKey: 'hotel_id',
    as: 'hotel',
  });

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
  applyAssociations,
  syncModels,
};