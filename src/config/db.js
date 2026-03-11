const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',

    // logging solo en development
    logging: (process.env.NODE_ENV || '').toLowerCase() === 'development' ? console.log : false,

    // Pool de conexiones
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: Number(process.env.DB_POOL_MIN) || 0,
      acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: Number(process.env.DB_POOL_IDLE) || 10000,
    },

    // Recomendaciones para manejo de fechas
    timezone: process.env.DB_TIMEZONE || '-05:00', // Ecuador por defecto
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  }
);

// Probar conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida');
    console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
    console.log(`🏷️  Host: ${process.env.DB_HOST}:${Number(process.env.DB_PORT) || 3306}`);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    return false;
  }
};

// Cierre limpio (producción)
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexión Sequelize cerrada.');
  } catch (error) {
    console.error('❌ Error cerrando Sequelize:', error.message);
  }
};

module.exports = { sequelize, testConnection, closeConnection };
