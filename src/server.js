require('dotenv').config();
const app = require('./app');

const { testConnection, closeConnection } = require('./config/db');
const { syncModels } = require('./models');

const PORT = process.env.PORT || 3000;

let server;

const startServer = async () => {
  console.log('Iniciando Hotel Booking System...');
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);

  try {
    console.log('Conectando a la base de datos...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('No se pudo conectar a MySQL. Verifica lo siguiente:');
      console.error('1. Que MySQL esté corriendo');
      console.error('2. Que las credenciales en el archivo .env sean correctas');
      console.error('3. Que la base de datos exista');
      process.exit(1);
    }

    const shouldSync =
      (process.env.DB_SYNC || 'false').toLowerCase() === 'true' &&
      (process.env.NODE_ENV || '').toLowerCase() !== 'production';

    if (shouldSync) {
      console.log('Sincronizando modelos en entorno de desarrollo...');
      await syncModels();
    } else {
      console.log('Sincronizacion de modelos desactivada.');
    }

    server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`Base de datos: ${process.env.DB_NAME || 'No definida'}`);
      console.log(`JWT configurado: ${process.env.JWT_SECRET ? 'Si' : 'No'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log('Endpoints base disponibles:');
      console.log(`Auth: http://localhost:${PORT}/api/v1/auth`);
      console.log(`Bookings: http://localhost:${PORT}/api/v1/bookings`);
      console.log(`Rooms: http://localhost:${PORT}/api/v1/rooms`);
      console.log(`Guests: http://localhost:${PORT}/api/v1/guests`);
      console.log(`Hotels: http://localhost:${PORT}/api/v1/hotels`);
      console.log(`Payments: http://localhost:${PORT}/api/v1/payments`);
      console.log(`Admin: http://localhost:${PORT}/api/v1/admin`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  try {
    console.log(`Apagando servidor por señal: ${signal}`);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('Servidor HTTP cerrado correctamente');
    }

    await closeConnection();

    process.exit(0);
  } catch (error) {
    console.error('Error durante el cierre del servidor:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('Error no manejado en promesa:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Excepcion no capturada:', error);
  shutdown('uncaughtException');
});

startServer();