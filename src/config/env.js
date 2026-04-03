id="env-config"
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  PORT: Number(process.env.PORT) || 3000,

  DB: {
    HOST: process.env.DB_HOST,
    PORT: Number(process.env.DB_PORT) || 3306,
    NAME: process.env.DB_NAME,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
  },

  JWT_SECRET: process.env.JWT_SECRET,

  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
};