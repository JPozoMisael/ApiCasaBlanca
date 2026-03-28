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

    reserva_id: {
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
        name: 'uq_valoracion_reserva',
        unique: true,
        fields: ['reserva_id'],
      },
    ],
  }
);

module.exports = Valoracion;