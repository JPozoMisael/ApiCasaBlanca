const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Hotel = sequelize.define(
  'Hotel',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    direccion: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    ciudad: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },

    pais: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Ecuador',
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },

    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    estrellas: {
      type: DataTypes.TINYINT,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'hoteles',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Hotel;