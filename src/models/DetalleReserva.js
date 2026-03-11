const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DetalleReserva = sequelize.define(
  'DetalleReserva',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    reserva_id: { type: DataTypes.INTEGER, allowNull: false },
    habitacion_id: { type: DataTypes.INTEGER, allowNull: false },

    precio_noche: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    noches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1, max: 365 },
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  {
    tableName: 'detalle_reserva',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_detalle_reserva', fields: ['reserva_id'] },
      { name: 'idx_detalle_habitacion', fields: ['habitacion_id'] },
      {
        // Evita duplicar la misma habitación en la misma reserva (si aplica)
        name: 'uq_detalle_reserva_habitacion',
        unique: true,
        fields: ['reserva_id', 'habitacion_id'],
      },
    ],
    hooks: {
      beforeValidate: (d) => {
        const precio = Number(d.precio_noche || 0);
        const noches = Number(d.noches || 0);
        if (precio >= 0 && noches >= 1) {
          d.subtotal = (precio * noches).toFixed(2);
        }
      },
    },
  }
);

module.exports = DetalleReserva;
