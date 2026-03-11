const Hotel = require('./Hotel');
const TipoHabitacion = require('./TipoHabitacion');
const Habitacion = require('./Habitacion');
const Cliente = require('./Cliente');
const Reserva = require('./Reserva');
const Pago = require('./Pago');

const models = {
  Hotel,
  TipoHabitacion,
  Habitacion,
  Cliente,
  Reserva,
  Pago,
};

function applyAssociations() {
  Hotel.hasMany(TipoHabitacion, { foreignKey: 'hotel_id' });
  TipoHabitacion.belongsTo(Hotel, { foreignKey: 'hotel_id' });

  Hotel.hasMany(Habitacion, { foreignKey: 'hotel_id' });
  Habitacion.belongsTo(Hotel, { foreignKey: 'hotel_id' });

  TipoHabitacion.hasMany(Habitacion, { foreignKey: 'tipo_habitacion_id' });
  Habitacion.belongsTo(TipoHabitacion, { foreignKey: 'tipo_habitacion_id' });

  Cliente.hasMany(Reserva, { foreignKey: 'cliente_id' });
  Reserva.belongsTo(Cliente, { foreignKey: 'cliente_id' });

  Hotel.hasMany(Reserva, { foreignKey: 'hotel_id' });
  Reserva.belongsTo(Hotel, { foreignKey: 'hotel_id' });

  Reserva.hasMany(Pago, { foreignKey: 'reserva_id' });
  Pago.belongsTo(Reserva, { foreignKey: 'reserva_id' });
}

module.exports = { models, applyAssociations };
