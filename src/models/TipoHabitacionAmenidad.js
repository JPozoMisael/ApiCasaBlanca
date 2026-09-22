const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TipoHabitacionAmenidad = sequelize.define(
  'TipoHabitacionAmenidad',
  {
    tipo_habitacion_id: { type: DataTypes.INTEGER, primaryKey: true },
    amenidad_id: { type: DataTypes.INTEGER, primaryKey: true },
  },
  { tableName: 'tipo_habitacion_amenidades', timestamps: false, underscored: true }
);

module.exports = TipoHabitacionAmenidad;
