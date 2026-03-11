const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ServicioReserva = sequelize.define(
  'ServicioReserva',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    reserva_id: { type: DataTypes.INTEGER, allowNull: false },
    servicio_id: { type: DataTypes.INTEGER, allowNull: false },

    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1, max: 9999 },
    },

    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  {
    tableName: 'servicios_reserva',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_sr_reserva', fields: ['reserva_id'] },
      { name: 'idx_sr_servicio', fields: ['servicio_id'] },
    ],
    hooks: {
      beforeValidate: (sr) => {
        const c = Number(sr.cantidad || 0);
        const p = Number(sr.precio_unitario || 0);
        if (c >= 1 && p >= 0) {
          sr.subtotal = (c * p).toFixed(2);
        }
      },
    },
  }
);

module.exports = ServicioReserva;
