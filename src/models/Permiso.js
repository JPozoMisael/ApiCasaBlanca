const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Capacidad concreta ("reservas.gestionar"). Las rutas de la API exigen permisos, no roles.
const Permiso = sequelize.define(
  'Permiso',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clave: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    modulo: { type: DataTypes.STRING(40), allowNull: false },
    descripcion: { type: DataTypes.STRING(200), allowNull: false },
  },
  { tableName: 'permisos', timestamps: true, underscored: true }
);

module.exports = Permiso;
