const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Huésped. Puede estar vinculado a una cuenta (user_id) o ser un invitado sin cuenta.
const Cliente = sequelize.define(
  'Cliente',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    user_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },

    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },

    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 100] },
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', value ? String(value).trim().toLowerCase() : null);
      },
    },

    telefono: { type: DataTypes.STRING(20), allowNull: true },

    tipo_documento: {
      type: DataTypes.ENUM('cedula', 'pasaporte', 'dni'),
      allowNull: true,
    },

    // Ya no es único global: el mismo huésped puede reservar en varios hoteles.
    documento_identidad: { type: DataTypes.STRING(50), allowNull: true },

    nacionalidad: { type: DataTypes.STRING(50), allowNull: true },
    fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
    direccion: { type: DataTypes.STRING(200), allowNull: true },
    observaciones: { type: DataTypes.TEXT, allowNull: true },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'clientes',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_cliente_email', fields: ['email'] },
      { name: 'idx_cliente_documento', fields: ['documento_identidad'] },
    ],
  }
);

module.exports = Cliente;
