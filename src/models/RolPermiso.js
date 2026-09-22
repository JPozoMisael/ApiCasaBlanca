const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RolPermiso = sequelize.define(
  'RolPermiso',
  {
    rol_id: { type: DataTypes.INTEGER, primaryKey: true },
    permiso_id: { type: DataTypes.INTEGER, primaryKey: true },
  },
  { tableName: 'rol_permisos', timestamps: false, underscored: true }
);

module.exports = RolPermiso;
