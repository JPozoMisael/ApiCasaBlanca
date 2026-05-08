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

    // ================= RESERVA =================
    // TEMPORALMENTE OPCIONAL
    // Para permitir reviews desde frontend
    // sin flujo completo de reservas
    reserva_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ================= HOTEL =================
    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ================= PUNTUACION =================
    puntuacion: {
      type: DataTypes.TINYINT,
      allowNull: false,

      validate: {
        min: 1,
        max: 10,
      },
    },

    // ================= COMENTARIO =================
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ================= FECHA =================
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

      // REVIEW POR RESERVA
      {
        name: 'uq_valoracion_reserva',
        unique: true,
        fields: ['reserva_id'],
      },

      // REVIEWS HOTEL
      {
        name: 'idx_valoracion_hotel',

        fields: ['hotel_id'],
      },
    ],
  }
);

module.exports = Valoracion;