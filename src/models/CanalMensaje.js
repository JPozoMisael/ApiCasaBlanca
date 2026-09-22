const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Bitácora de mensajes intercambiados con el channel manager (para soporte y certificación).
// No guarda contraseñas ni datos de tarjetas: solo un resumen.
const CanalMensaje = sequelize.define(
  'CanalMensaje',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conexion_id: { type: DataTypes.INTEGER, allowNull: true },
    hotel_id: { type: DataTypes.INTEGER, allowNull: true },
    direccion: { type: DataTypes.ENUM('entrada', 'salida'), allowNull: false },
    tipo: { type: DataTypes.STRING(60), allowNull: false },
    resultado: { type: DataTypes.ENUM('ok', 'error'), allowNull: false },
    echo_token: { type: DataTypes.STRING(64), allowNull: true },
    detalle: { type: DataTypes.STRING(500), allowNull: true },
    ms: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'canal_mensajes',
    timestamps: true,
    underscored: true,
    indexes: [{ name: 'idx_canal_msg_hotel', fields: ['hotel_id', 'created_at'] }],
  }
);

module.exports = CanalMensaje;
