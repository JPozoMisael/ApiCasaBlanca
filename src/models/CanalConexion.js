const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Conexión de un hotel con un channel manager (hoy: SiteMinder / Little Hotelier).
// La plataforma actúa como un CANAL de venta: el channel manager le empuja disponibilidad y
// tarifas, y ella le devuelve las reservas.
const CanalConexion = sequelize.define(
  'CanalConexion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    proveedor: { type: DataTypes.ENUM('siteminder'), allowNull: false, defaultValue: 'siteminder' },

    // Código con el que el channel manager identifica este alojamiento (HotelCode). Lo entrega el hotel.
    codigo_hotel: { type: DataTypes.STRING(40), allowNull: false, unique: true },

    // pendiente = creada, aún no llegó disponibilidad (se vende con el inventario propio)
    // activa    = el inventario y las tarifas de los tipos mapeados vienen del channel manager
    // pausada   = los tipos mapeados NO se venden por esta plataforma
    estado: { type: DataTypes.ENUM('pendiente', 'activa', 'pausada'), allowNull: false, defaultValue: 'pendiente' },

    moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    // Si las tarifas que envía el channel manager ya traen impuestos (IVA).
    precios_incluyen_impuestos: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Código del plan de tarifa (uno por tipo de habitación).
    plan_tarifa_codigo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'BAR' },

    ultima_entrada_en: { type: DataTypes.DATE, allowNull: true },
    ultimo_error: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'canal_conexiones',
    timestamps: true,
    underscored: true,
    indexes: [{ name: 'uq_canal_hotel_proveedor', unique: true, fields: ['hotel_id', 'proveedor'] }],
  }
);

module.exports = CanalConexion;
