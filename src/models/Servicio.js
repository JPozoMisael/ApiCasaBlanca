const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Servicio = sequelize.define(
  'Servicio',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    tipo: {
      type: DataTypes.ENUM('habitacion', 'reserva', 'general'),
      allowNull: false,
      defaultValue: 'reserva',
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'servicios',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_servicio_hotel',
        fields: ['hotel_id'],
      },
      {
        name: 'idx_servicio_estado',
        fields: ['estado'],
      },
      {
        name: 'uq_servicio_hotel_nombre',
        unique: true,
        fields: ['hotel_id', 'nombre'],
      },
    ],
  }
);

module.exports = Servicio;