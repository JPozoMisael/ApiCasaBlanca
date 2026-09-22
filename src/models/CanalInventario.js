const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Última versión conocida de disponibilidad, tarifa y restricciones de un tipo de habitación en una fecha,
// tal como la envía el channel manager (fuente de verdad para los tipos mapeados).
const CanalInventario = sequelize.define(
  'CanalInventario',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conexion_id: { type: DataTypes.INTEGER, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_habitacion_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },

    // null = el channel manager aún no envió cantidad (no se vende)
    disponibles: { type: DataTypes.INTEGER, allowNull: true },
    // Ventas hechas aquí desde la última actualización del channel manager; se restan hasta que él confirme.
    vendidas_local: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // por noche, sin impuestos

    cerrado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // stop sell
    cerrado_llegada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    cerrado_salida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    min_estancia: { type: DataTypes.INTEGER, allowNull: true },
    max_estancia: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'canal_inventario',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'uq_canal_inv', unique: true, fields: ['tipo_habitacion_id', 'fecha'] },
      { name: 'idx_canal_inv_hotel_fecha', fields: ['hotel_id', 'fecha'] },
    ],
  }
);

module.exports = CanalInventario;
