const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Hotel = sequelize.define(
  'Hotel',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    direccion: { type: DataTypes.STRING(200) },
    ciudad: { type: DataTypes.STRING(50), allowNull: false },
    pais: { type: DataTypes.STRING(50), allowNull: false },

    telefono: { type: DataTypes.STRING(20) },
    email: { type: DataTypes.STRING(100) },

    estrellas: { type: DataTypes.TINYINT },
  },
  {
    tableName: 'hoteles',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Hotel;
