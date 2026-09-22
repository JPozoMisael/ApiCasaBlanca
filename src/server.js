require('dotenv').config();
const app = require('./app');

const { testConnection, closeConnection } = require('./config/db');
const { syncModels } = require('./models');
const { expirarReservasPendientes } = require('./services/reservas.service');
const { enviarPendientes } = require('./integrations/siteminder/salida.service');
const { APP_NAME } = require('./config/constants');

const PORT = process.env.PORT || 3000;
const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

let server;
let timerExpiracion;
let timerCanal;

const startServer = async () => {
  console.log(`Iniciando ${APP_NAME}...`);

  if (isProd && !process.env.JWT_SECRET) {
    console.error('JWT_SECRET es obligatorio en producción');
    process.exit(1);
  }

  if (!(await testConnection())) {
    console.error('No se pudo conectar a la base de datos. Revisa el archivo .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1);
  }

  // Solo desarrollo. En producción el esquema se actualiza con `npm run db:migrate`.
  if ((process.env.DB_SYNC || 'false').toLowerCase() === 'true' && !isProd) {
    console.log('Sincronizando modelos (DB_SYNC=true)...');
    await syncModels();
  }

  server = app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}  (health: /health, api: /api/v1)`);
  });

  // Libera el inventario retenido por reservas pendientes de pago que expiraron.
  timerExpiracion = setInterval(async () => {
    try {
      const n = await expirarReservasPendientes();
      if (n) console.log(`Reservas expiradas: ${n}`);
    } catch (e) {
      console.error('Error expirando reservas:', e.message);
    }
  }, 5 * 60 * 1000);
  timerExpiracion.unref();

  // Envía al channel manager las reservas pendientes (con reintentos y esperas crecientes).
  timerCanal = setInterval(() => {
    enviarPendientes().catch((e) => console.error('Error enviando reservas al channel manager:', e.message));
  }, 30 * 1000);
  timerCanal.unref();
};

const shutdown = async (signal) => {
  try {
    console.log(`Apagando por ${signal}`);
    clearInterval(timerExpiracion);
    clearInterval(timerCanal);
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => console.error('Promesa sin manejar:', error));
process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
  shutdown('uncaughtException');
});

startServer();
