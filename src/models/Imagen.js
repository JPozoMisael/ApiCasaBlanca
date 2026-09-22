const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Galería de un hotel; si tipo_habitacion_id está presente, la foto es de ese tipo de habitación.
const Imagen = sequelize.define(
  'Imagen',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo_habitacion_id: { type: DataTypes.INTEGER, allowNull: true },
    url: { type: DataTypes.STRING(500), allowNull: false },
    alt: { type: DataTypes.STRING(200), allowNull: true },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'imagenes',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_imagen_hotel', fields: ['hotel_id'] },
      { name: 'idx_imagen_tipo', fields: ['tipo_habitacion_id'] },
    ],
  }
);

module.exports = Imagen;
