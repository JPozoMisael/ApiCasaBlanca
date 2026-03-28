const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Habitacion = sequelize.define(
  'Habitacion',
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

    tipo_habitacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    numero_habitacion: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10],
      },
    },

    piso: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },

    estado: {
      type: DataTypes.ENUM(
        'disponible',
        'ocupada',
        'mantenimiento',
        'limpieza',
        'inactiva'
      ),
      allowNull: false,
      defaultValue: 'disponible',
    },
  },
  {
    tableName: 'habitaciones',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['hotel_id', 'numero_habitacion'],
      },
    ],
  }
);

module.exports = Habitacion;