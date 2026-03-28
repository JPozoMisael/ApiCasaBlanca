const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Temporada = sequelize.define(
  'Temporada',
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

    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

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
      { name: 'idx_temporada_hotel', fields: ['hotel_id'] },
      { name: 'idx_temporada_fechas', fields: ['fecha_inicio', 'fecha_fin'] },
      { name: 'idx_temporada_estado', fields: ['estado'] },
    ],
    hooks: {
      beforeValidate: (temporada) => {
        if (temporada.fecha_inicio && temporada.fecha_fin) {
          const inicio = new Date(temporada.fecha_inicio);
          const fin = new Date(temporada.fecha_fin);

          if (fin < inicio) {
            throw new Error('fecha_fin no puede ser menor que fecha_inicio');
          }
        }
      },
    },
  }
);

module.exports = Temporada;