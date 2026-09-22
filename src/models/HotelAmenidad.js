const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HotelAmenidad = sequelize.define(
  'HotelAmenidad',
  {
    hotel_id: { type: DataTypes.INTEGER, primaryKey: true },
    amenidad_id: { type: DataTypes.INTEGER, primaryKey: true },
  },
  { tableName: 'hotel_amenidades', timestamps: false, underscored: true }
);

module.exports = HotelAmenidad;
