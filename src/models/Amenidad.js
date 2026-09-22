const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Catálogo global de comodidades (WiFi, piscina, frente al mar...).
const Amenidad = sequelize.define(
  'Amenidad',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    icono: { type: DataTypes.STRING(50), allowNull: true },
    categoria: {
      type: DataTypes.ENUM('general', 'habitacion', 'exterior', 'servicio', 'accesibilidad'),
      allowNull: false,
      defaultValue: 'general',
    },
    // Si aparece como filtro destacado en el buscador
    filtrable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'amenidades', timestamps: true, underscored: true }
);

module.exports = Amenidad;
