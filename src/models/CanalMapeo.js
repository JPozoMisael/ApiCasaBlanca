const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Equivalencia entre un tipo de habitación de la plataforma y su código en el channel manager (InvTypeCode).
const CanalMapeo = sequelize.define(
  'CanalMapeo',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conexion_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_habitacion_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo_habitacion: { type: DataTypes.STRING(40), allowNull: false },
  },
  {
    tableName: 'canal_mapeos',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'uq_mapeo_tipo', unique: true, fields: ['conexion_id', 'tipo_habitacion_id'] },
      { name: 'uq_mapeo_codigo', unique: true, fields: ['conexion_id', 'codigo_habitacion'] },
    ],
  }
);

module.exports = CanalMapeo;
