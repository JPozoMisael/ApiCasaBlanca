const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Reserva = sequelize.define(
  'Reserva',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    codigo_reserva: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [4, 20],
      },
    },

    fecha_entrada: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    fecha_salida: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterFechaEntrada(value) {
          if (this.fecha_entrada && value) {
            const entrada = new Date(this.fecha_entrada);
            const salida = new Date(value);

            if (salida <= entrada) {
              throw new Error('La fecha de salida debe ser mayor a la fecha de entrada');
            }
          }
        },
      },
    },

    num_huespedes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    estado: {
      type: DataTypes.ENUM(
        'pendiente',
        'confirmada',
        'check_in',
        'check_out',
        'cancelada',
        'no_show'
      ),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: '0.00',
      validate: {
        min: 0,
      },
    },

    impuestos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: '0.00',
      validate: {
        min: 0,
      },
    },

    precio_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: '0.00',
      validate: {
        min: 0,
      },
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'reservas',
    timestamps: true,
    underscored: true,

    hooks: {
      beforeSave: (reserva) => {
        const subtotal = Number(reserva.subtotal || 0);
        const impuestos = Number(reserva.impuestos || 0);

        reserva.precio_total = (subtotal + impuestos).toFixed(2);
      },
    },
  }
);

module.exports = Reserva;