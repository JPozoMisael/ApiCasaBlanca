const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Rol de acceso. `alcance` decide el tipo de cuenta:
//   plataforma → equipo de la plataforma (ve todos los hoteles)
//   hotel      → personal de un alojamiento (atado a su hotel)
//   cliente    → huésped (sin panel)
const Rol = sequelize.define(
  'Rol',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clave: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
    alcance: { type: DataTypes.ENUM('plataforma', 'hotel', 'cliente'), allowNull: false, defaultValue: 'hotel' },
    // Roles del sistema: no se pueden borrar ni cambiar su clave.
    es_sistema: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Si un administrador de hotel puede asignarlo a su personal.
    asignable_por_hotel: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'roles', timestamps: true, underscored: true }
);

module.exports = Rol;
