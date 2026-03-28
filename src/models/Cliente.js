const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Cliente = sequelize.define(
  'Cliente',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    tipo_documento: {
      type: DataTypes.ENUM('cedula', 'pasaporte', 'dni'),
      allowNull: true,
    },

    documento_identidad: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },

    nacionalidad: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    direccion: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

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
  }
);

module.exports = Cliente;