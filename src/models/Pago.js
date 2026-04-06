const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Pago = sequelize.define(
  'Pago',
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

    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },

    metodo: {
      type: DataTypes.ENUM(
        'tarjeta',
        'efectivo',
        'transferencia',
        'paypal',
        'deposito'
      ),
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM(
        'pendiente',
        'aprobado',
        'rechazado',
        'anulado'
      ),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    referencia: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true, // 🔥 importante para pagos externos
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fecha_pago: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'pagos',
    timestamps: true,
    underscored: true,

    hooks: {
      beforeValidate: (pago) => {
        // 🔥 Normalizar monto
        const monto = Number(pago.monto);

        if (!Number.isFinite(monto) || monto <= 0) {
          throw new Error('Monto inválido');
        }

        pago.monto = monto.toFixed(2);
      },
    },

    indexes: [
      { fields: ['reserva_id'] },
      { fields: ['estado'] },
      { unique: true, fields: ['referencia'] },
    ],
  }
);

module.exports = Pago;