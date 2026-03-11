const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BloqueoHabitacion = sequelize.define(
  'BloqueoHabitacion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    habitacion_id: { type: DataTypes.INTEGER, allowNull: false },

    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },

    motivo: { type: DataTypes.STRING(200), allowNull: true },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'bloqueos_habitacion',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_bloqueo_habitacion', fields: ['habitacion_id'] },
      { name: 'idx_bloqueo_fechas', fields: ['fecha_inicio', 'fecha_fin'] },
      { name: 'idx_bloqueo_estado', fields: ['estado'] },
    ],
    hooks: {
      beforeValidate: (b) => {
        if (b.fecha_inicio && b.fecha_fin) {
          const a = new Date(b.fecha_inicio);
          const c = new Date(b.fecha_fin);
          if (c < a) throw new Error('fecha_fin no puede ser menor que fecha_inicio');
        }
      },
    },
  }
);

module.exports = BloqueoHabitacion;
