const { Sequelize } = require('sequelize');

const dialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';

const commonDefine = {
  freezeTableName: true,
  timestamps: true,
};

let sequelize;

if (dialect === 'sqlite') {
  // Solo para tests y desarrollo local sin MySQL.
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || ':memory:',
    logging: false,
    define: commonDefine,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      dialect,

      logging: isDev ? console.log : false,

      pool: {
        max: Number(process.env.DB_POOL_MAX) || 10,
        min: Number(process.env.DB_POOL_MIN) || 0,
        acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
        idle: Number(process.env.DB_POOL_IDLE) || 10000,
      },

      timezone: process.env.DB_TIMEZONE || '-05:00',
      define: commonDefine,

      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',

      dialectOptions: {
        dateStrings: true,
        typeCast: true,
        charset: 'utf8mb4',
      },
    }
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Conexion ${dialect} establecida (${process.env.DB_NAME || 'memoria'})`);
    return true;
  } catch (error) {
    console.error('Error de conexion a la base de datos:', error.message);
    return false;
  }
};

const closeConnection = async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Error cerrando Sequelize:', error.message);
  }
};

module.exports = { sequelize, testConnection, closeConnection };
