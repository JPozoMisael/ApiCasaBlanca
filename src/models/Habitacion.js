const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Habitacion = sequelize.define(
  'Habitacion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_habitacion_id: { type: DataTypes.INTEGER, allowNull: false },

    numero_habitacion: { type: DataTypes.STRING(10), allowNull: false },
    piso: { type: DataTypes.INTEGER },

    estado: {
      type: DataTypes.ENUM('disponible', 'ocupada', 'mantenimiento', 'limpieza'),
      defaultValue: 'disponible',
    },
  },
  {
    tableName: 'habitaciones',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Habitacion;
