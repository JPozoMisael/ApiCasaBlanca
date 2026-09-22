const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Favorito = sequelize.define(
  'Favorito',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: 'favoritos',
    timestamps: true,
    underscored: true,
    indexes: [{ name: 'uq_favorito', unique: true, fields: ['user_id', 'hotel_id'] }],
  }
);

module.exports = Favorito;
