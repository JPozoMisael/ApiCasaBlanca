const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TipoHabitacion = sequelize.define(
  'TipoHabitacion',
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

    capacidad_maxima: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    metros_cuadrados: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },

    camas_sencillas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    camas_dobles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    tiene_vista: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    tiene_balcon: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'tipos_habitacion',
    timestamps: true,
    underscored: true,
  }
);

module.exports = TipoHabitacion;