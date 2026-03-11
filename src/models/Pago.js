const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Pago = sequelize.define(
  'Pago',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    reserva_id: { type: DataTypes.INTEGER, allowNull: false },

    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

    metodo: {
      type: DataTypes.ENUM('tarjeta', 'efectivo', 'transferencia', 'paypal'),
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM('pendiente', 'completado', 'fallido'),
      defaultValue: 'pendiente',
    },
  },
  {
    tableName: 'pagos',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Pago;
