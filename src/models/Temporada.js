const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Temporada = sequelize.define(
  'Temporada',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    nombre: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },

    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },

    // Ej: alta / baja / media
    tipo: {
      type: DataTypes.ENUM('alta', 'media', 'baja'),
      allowNull: false,
      defaultValue: 'media',
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'temporadas',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_temporada_fechas', fields: ['fecha_inicio', 'fecha_fin'] },
      { name: 'idx_temporada_estado', fields: ['estado'] },
    ],
    hooks: {
      beforeValidate: (t) => {
        if (t.fecha_inicio && t.fecha_fin) {
          const a = new Date(t.fecha_inicio);
          const b = new Date(t.fecha_fin);
          if (b < a) throw new Error('fecha_fin no puede ser menor que fecha_inicio');
        }
      },
    },
  }
);

module.exports = Temporada;
