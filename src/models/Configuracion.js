const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Configuracion = sequelize.define(
  'Configuracion',
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

    clave: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    valor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    tipo: {
      type: DataTypes.ENUM(
        'text',
        'number',
        'boolean',
        'json'
      ),
      defaultValue: 'text',
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'configuraciones',

    timestamps: true,

    underscored: true,

    indexes: [
      {
        unique: true,
        fields: ['hotel_id', 'clave'],
      },
    ],
  }
);

module.exports = Configuracion;