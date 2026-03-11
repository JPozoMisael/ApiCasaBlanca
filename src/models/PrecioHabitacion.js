const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PrecioHabitacion = sequelize.define(
  'PrecioHabitacion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    tipo_habitacion_id: { type: DataTypes.INTEGER, allowNull: false },

    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },

    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'precios_habitacion',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_precio_tipo', fields: ['tipo_habitacion_id'] },
      { name: 'idx_precio_fechas', fields: ['fecha_inicio', 'fecha_fin'] },
      { name: 'idx_precio_estado', fields: ['estado'] },
    ],
    hooks: {
      beforeValidate: (p) => {
        if (p.fecha_inicio && p.fecha_fin) {
          const a = new Date(p.fecha_inicio);
          const b = new Date(p.fecha_fin);
          if (b < a) throw new Error('fecha_fin no puede ser menor que fecha_inicio');
        }
      },
    },
  }
);

module.exports = PrecioHabitacion;
