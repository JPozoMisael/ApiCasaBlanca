const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BloqueoHabitacion = sequelize.define(
  'BloqueoHabitacion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    habitacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    tipo_bloqueo: {
      type: DataTypes.ENUM(
        'mantenimiento',
        'limpieza',
        'reparacion',
        'administrativo',
        'otro'
      ),
      allowNull: false,
      defaultValue: 'administrativo',
    },

    motivo: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'bloqueos_habitaciones',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_bloqueo_habitacion',
        fields: ['habitacion_id'],
      },
      {
        name: 'idx_bloqueo_fechas',
        fields: ['fecha_inicio', 'fecha_fin'],
      },
      {
        name: 'idx_bloqueo_estado',
        fields: ['estado'],
      },
    ],
    hooks: {
      beforeValidate: (bloqueo) => {
        if (bloqueo.fecha_inicio && bloqueo.fecha_fin) {
          const inicio = new Date(bloqueo.fecha_inicio);
          const fin = new Date(bloqueo.fecha_fin);

          if (fin < inicio) {
            throw new Error('fecha_fin no puede ser menor que fecha_inicio');
          }
        }
      },
    },
  }
);

module.exports = BloqueoHabitacion;