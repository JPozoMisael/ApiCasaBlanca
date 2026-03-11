const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido: { type: DataTypes.STRING(100), allowNull: false },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },

    password: { type: DataTypes.STRING, allowNull: false },

    rol: {
      type: DataTypes.ENUM('admin', 'empleado'),
      allowNull: false,
      defaultValue: 'empleado',
    },

    esta_activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    ultimo_login: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users', // ⚠️ cambia a 'usuarios' si tu tabla se llama así
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (u) => {
        if (u.password) {
          const salt = await bcrypt.genSalt(10);
          u.password = await bcrypt.hash(u.password, salt);
        }
      },
      beforeUpdate: async (u) => {
        if (u.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          u.password = await bcrypt.hash(u.password, salt);
        }
      },
    },
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: { attributes: {} },
    },
  }
);

User.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = User;
