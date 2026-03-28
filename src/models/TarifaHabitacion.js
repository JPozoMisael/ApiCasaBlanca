const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TarifaHabitacion = sequelize.define(
  'TarifaHabitacion',
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

    temporada_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    tipo_dia: {
      type: DataTypes.ENUM('entre_semana', 'fin_semana', 'feriado'),
      allowNull: false,
      defaultValue: 'entre_semana',
    },

    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'tarifas_habitacion',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_tarifa_hotel', fields: ['hotel_id'] },
      { name: 'idx_tarifa_tipo', fields: ['tipo_habitacion_id'] },
      { name: 'idx_tarifa_temporada', fields: ['temporada_id'] },
      { name: 'idx_tarifa_estado', fields: ['estado'] },
      {
        name: 'uq_tarifa_unica',
        unique: true,
        fields: ['hotel_id', 'tipo_habitacion_id', 'temporada_id', 'tipo_dia'],
      },
    ],
  }
);

module.exports = TarifaHabitacion;