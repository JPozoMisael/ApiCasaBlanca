const { DataTypes } = require('sequelize');

const { sequelize } =
  require('../config/db');

const bcrypt =
  require('bcryptjs');


const User = sequelize.define(
  'User',
  {

    // =====================================
    // ID
    // =====================================

    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },


    // =====================================
    // HOTEL
    // =====================================

    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },


    // =====================================
    // NOMBRE
    // =====================================

    nombre: {
      type: DataTypes.STRING(100),

      allowNull: false,

      validate: {
        notEmpty: true,
      },
    },


    // =====================================
    // APELLIDO
    // =====================================

    apellido: {
      type: DataTypes.STRING(100),

      allowNull: false,

      validate: {
        notEmpty: true,
      },
    },


    // =====================================
    // EMAIL
    // =====================================

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
          String(value)
            .trim()
            .toLowerCase()
        );
      },
    },


    // =====================================
    // PASSWORD
    // =====================================

    password: {
      type: DataTypes.STRING,

      allowNull: false,
    },


    // =====================================
    // ROL
    // =====================================

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


    // =====================================
    // ESTADO
    // =====================================

    estado: {
      type: DataTypes.ENUM(
        'activo',
        'inactivo'
      ),

      allowNull: false,

      defaultValue: 'activo',
    },


    // =====================================
    // ÚLTIMO LOGIN
    // =====================================

    ultimo_login: {
      type: DataTypes.DATE,

      allowNull: true,
    },
  },


  // =======================================
  // CONFIG
  // =======================================

  {

    tableName: 'users',

    timestamps: true,

    underscored: true,


    // =====================================
    // HOOKS
    // =====================================

    hooks: {

      beforeCreate: async (user) => {

        if (user.password) {

          const salt =
            await bcrypt.genSalt(10);

          user.password =
            await bcrypt.hash(
              user.password,
              salt
            );
        }
      },


      beforeUpdate: async (user) => {

        if (user.changed('password')) {

          const salt =
            await bcrypt.genSalt(10);

          user.password =
            await bcrypt.hash(
              user.password,
              salt
            );
        }
      },
    },


    // =====================================
    // DEFAULT SCOPE
    // =====================================

    defaultScope: {

      attributes: {
        exclude: ['password'],
      },
    },


    // =====================================
    // SCOPES
    // =====================================

    scopes: {

      withPassword: {

        attributes: {
          include: ['password'],
        },
      },
    },
  }
);


// =========================================
// MÉTODOS
// =========================================

User.prototype.comparePassword =
  async function (password) {

    return bcrypt.compare(
      password,
      this.password
    );
  };


module.exports = User;