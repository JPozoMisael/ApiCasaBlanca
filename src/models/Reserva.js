const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Reserva = sequelize.define(
  'Reserva',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },

    fecha_entrada: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_salida: { type: DataTypes.DATEONLY, allowNull: false },

    num_huespedes: { type: DataTypes.INTEGER, allowNull: false },

    estado: {
      type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada', 'completada'),
      defaultValue: 'pendiente',
    },

    precio_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    metodo_pago: { type: DataTypes.STRING(50) },
  },
  {
    tableName: 'reservas',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Reserva;
