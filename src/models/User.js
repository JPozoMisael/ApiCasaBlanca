const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      set(value) {
        this.setDataValue(
          'email',
          String(value).trim().toLowerCase()
        );
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    rol: {
      type: DataTypes.ENUM(
        'super_admin',
        'admin',
        'recepcion',
        'cliente'
      ),
      allowNull: false,
      defaultValue: 'cliente',
    },

    estado: {
      type: DataTypes.ENUM(
        'activo',
        'inactivo'
      ),
      allowNull: false,
      defaultValue: 'activo',
    },

    ultimo_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',

    timestamps: true,

    underscored: true,

    hooks: {

      beforeCreate: async (user) => {

        if (user.password) {

          const salt = await bcrypt.genSalt(10);

          user.password = await bcrypt.hash(
            user.password,
            salt
          );
        }
      },

      beforeUpdate: async (user) => {

        if (user.changed('password')) {

          const salt = await bcrypt.genSalt(10);

          user.password = await bcrypt.hash(
            user.password,
            salt
          );
        }
      },
    },

    defaultScope: {
      attributes: {
        exclude: ['password'],
      },
    },

    scopes: {
      withPassword: {
        attributes: {},
      },
    },
  }
);


// =========================================
// MÉTODOS
// =========================================

User.prototype.comparePassword = async function (password) {

  return bcrypt.compare(
    password,
    this.password
  );
};


module.exports = User;