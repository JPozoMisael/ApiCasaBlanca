const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TipoHabitacion = sequelize.define(
  'TipoHabitacion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    hotel_id: { type: DataTypes.INTEGER, allowNull: false },

    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },

    capacidad_maxima: { type: DataTypes.INTEGER, allowNull: false },
    metros_cuadrados: { type: DataTypes.DECIMAL(5, 2) },

    camas_sencillas: { type: DataTypes.INTEGER, defaultValue: 0 },
    camas_dobles: { type: DataTypes.INTEGER, defaultValue: 0 },

    tiene_vista: { type: DataTypes.BOOLEAN, defaultValue: false },
    tiene_balcon: { type: DataTypes.BOOLEAN, defaultValue: false },

    precio_base: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    tableName: 'tipo_habitacion',
    timestamps: true,
    underscored: true,
  }
);

module.exports = TipoHabitacion;
