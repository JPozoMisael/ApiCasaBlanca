const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Reseña de un huésped tras su estadía (verificada por reserva en check_out).
const Valoracion = sequelize.define(
  'Valoracion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    reserva_id: { type: DataTypes.INTEGER, allowNull: true },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: true },

    puntuacion: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: { min: 1, max: 10 },
    },

    titulo: { type: DataTypes.STRING(150), allowNull: true },
    comentario: { type: DataTypes.TEXT, allowNull: true },
    respuesta_hotel: { type: DataTypes.TEXT, allowNull: true },

    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

    estado: {
      type: DataTypes.ENUM('publicada', 'oculta'),
      allowNull: false,
      defaultValue: 'publicada',
    },
  },
  {
    tableName: 'valoraciones',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'uq_valoracion_reserva', unique: true, fields: ['reserva_id'] },
      { name: 'idx_valoracion_hotel', fields: ['hotel_id'] },
    ],
  }
);

module.exports = Valoracion;
