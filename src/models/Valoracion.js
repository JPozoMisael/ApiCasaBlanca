const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Valoracion = sequelize.define(
  'Valoracion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // RELACIÓN REAL
    reserva_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // CLAVE NUEVA (para frontend rápido)
    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    puntuacion: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 10,
      },
    },

    comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'valoraciones',
    timestamps: true,
    underscored: true,

    indexes: [
      {
        // 1 review por reserva
        name: 'uq_valoracion_reserva',
        unique: true,
        fields: ['reserva_id'],
      },
      {
        // búsquedas rápidas por hotel
        name: 'idx_valoracion_hotel',
        fields: ['hotel_id'],
      },
    ],
  }
);

module.exports = Valoracion;