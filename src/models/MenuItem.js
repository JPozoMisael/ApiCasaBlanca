const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Opciones del menú lateral del panel. Cada usuario ve solo las que su rol puede usar.
const MenuItem = sequelize.define(
  'MenuItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clave: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    texto: { type: DataTypes.STRING(60), allowNull: false },
    icono: { type: DataTypes.STRING(40), allowNull: true },
    ruta: { type: DataTypes.STRING(120), allowNull: false },
    seccion: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Gestión' },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Permiso necesario para ver la opción (null = cualquier personal).
    permiso_id: { type: DataTypes.INTEGER, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'menu_items', timestamps: true, underscored: true }
);

module.exports = MenuItem;
