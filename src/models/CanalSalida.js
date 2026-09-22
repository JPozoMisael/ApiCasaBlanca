const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Cola de reservas por enviar al channel manager (Commit / Cancel), con reintentos.
const CanalSalida = sequelize.define(
  'CanalSalida',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conexion_id: { type: DataTypes.INTEGER, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    reserva_id: { type: DataTypes.INTEGER, allowNull: false },
    accion: { type: DataTypes.ENUM('Commit', 'Cancel'), allowNull: false },
    // pendiente → enviado | error (rechazado por el channel manager o sin más reintentos) | omitido
    estado: { type: DataTypes.ENUM('pendiente', 'enviado', 'error', 'omitido'), allowNull: false, defaultValue: 'pendiente' },
    intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    proximo_intento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ultimo_error: { type: DataTypes.STRING(500), allowNull: true },
    enviado_en: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'canal_salidas',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_canal_salida_cola', fields: ['estado', 'proximo_intento'] },
      { name: 'idx_canal_salida_reserva', fields: ['reserva_id'] },
    ],
  }
);

module.exports = CanalSalida;
