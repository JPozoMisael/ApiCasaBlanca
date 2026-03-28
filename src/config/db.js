const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',

    logging:
      (process.env.NODE_ENV || '').toLowerCase() === 'development'
        ? console.log
        : false,

    pool: {
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: Number(process.env.DB_POOL_MIN) || 0,
      acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: Number(process.env.DB_POOL_IDLE) || 10000,
    },

    timezone: process.env.DB_TIMEZONE || '-05:00',

    define: {
      freezeTableName: true,
      timestamps: true,
    },

    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',

    dialectOptions: {
      dateStrings: true,
      typeCast: true,
      charset: 'utf8mb4',
    },
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexion a MySQL establecida correctamente');
    console.log(`Base de datos: ${process.env.DB_NAME}`);
    console.log(`Host: ${process.env.DB_HOST}:${Number(process.env.DB_PORT) || 3306}`);
    return true;
  } catch (error) {
    console.error('Error de conexion a la base de datos:', error.message);
    return false;
  }
};

const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('Conexion Sequelize cerrada correctamente');
  } catch (error) {
    console.error('Error cerrando Sequelize:', error.message);
  }
};

module.exports = { sequelize, testConnection, closeConnection };