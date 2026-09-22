const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Sector/parroquia del cantón: Chipipe, Las Palmeras, Anconcito, etc.
const Zona = sequelize.define(
  'Zona',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    parroquia: { type: DataTypes.STRING(80), allowNull: true },
    latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    imagen_url: { type: DataTypes.STRING(500), allowNull: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  { tableName: 'zonas', timestamps: true, underscored: true }
);

module.exports = Zona;
