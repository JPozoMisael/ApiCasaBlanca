const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ServicioReserva = sequelize.define(
  'ServicioReserva',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    reserva_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    servicio_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 9999,
      },
    },

    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: 'reserva_servicios',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_rs_reserva', fields: ['reserva_id'] },
      { name: 'idx_rs_servicio', fields: ['servicio_id'] },
    ],
    hooks: {
      beforeValidate: (registro) => {
        const cantidad = Number(registro.cantidad || 0);
        const precio = Number(registro.precio_unitario || 0);

        if (cantidad >= 1 && precio >= 0) {
          registro.subtotal = Number((cantidad * precio).toFixed(2));
        }
      },
    },
  }
);

module.exports = ServicioReserva;