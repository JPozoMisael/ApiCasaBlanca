const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Cliente = sequelize.define(
  'Cliente',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido: { type: DataTypes.STRING(100), allowNull: false },

    email: { type: DataTypes.STRING(100) },
    telefono: { type: DataTypes.STRING(20) },

    tipo_documento: {
      type: DataTypes.ENUM('cedula', 'pasaporte', 'dni'),
    },
    documento_identidad: { type: DataTypes.STRING(50) },
  },
  {
    tableName: 'clientes',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Cliente;
