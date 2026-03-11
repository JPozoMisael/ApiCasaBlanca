require('dotenv').config();
const app = require('./app');

const { testConnection, pool } = require('./config/db');
const { syncModels } = require('./models');

const PORT = process.env.PORT || 3000;

let server; // referencia para apagar limpio

const startServer = async () => {
  console.log('🚀 Iniciando Hotel Booking System...');
  console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Probar conexión a BD
    console.log('🔌 Conectando a la base de datos...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ No se pudo conectar a MySQL. Verifica:');
      console.error('   1) MySQL esté corriendo');
      console.error('   2) Credenciales en .env');
      console.error('   3) Base de datos exista');
      process.exit(1);
    }

    // Sincronizar modelos SOLO si está permitido
    // Recomendado: en producción usar migraciones, no sync.
    const shouldSync =
      (process.env.DB_SYNC || 'false').toLowerCase() === 'true' &&
      (process.env.NODE_ENV || '').toLowerCase() !== 'production';

    if (shouldSync) {
      console.log('🔄 Sincronizando modelos (solo desarrollo)...');
      await syncModels();
    } else {
      console.log('ℹ️  Sync de modelos desactivado (producción/seguro).');
    }

    // Levantar server
    server = app.listen(PORT, () => {
      console.log(`✅ Servidor listo en: http://localhost:${PORT}`);
      console.log(`📊 Base de datos: ${process.env.DB_NAME || '(sin DB_NAME)'}`);
      console.log(`🔐 JWT configurado: ${process.env.JWT_SECRET ? 'Sí' : 'No'}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log('\n📋 Endpoints base (v1):');
      console.log(`   🔐 Auth:     http://localhost:${PORT}/api/v1/auth`);
      console.log(`   📅 Bookings: http://localhost:${PORT}/api/v1/bookings`);
      console.log(`   🛏️  Rooms:    http://localhost:${PORT}/api/v1/rooms`);
      console.log(`   👤 Guests:   http://localhost:${PORT}/api/v1/guests`);
      console.log(`   🏨 Hotels:   http://localhost:${PORT}/api/v1/hotels (si existe)`);
      console.log(`   💳 Payments: http://localhost:${PORT}/api/v1/payments (si existe)`);
      console.log(`   👑 Admin:    http://localhost:${PORT}/api/v1/admin (si existe)`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Apagado limpio
const shutdown = async (signal) => {
  try {
    console.log(`\n👋 Apagando servidor (${signal})...`);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ HTTP server cerrado.');
    }

    await closeConnection();

    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante shutdown:', err);
    process.exit(1);
  }
};


process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Errores no manejados
process.on('unhandledRejection', (err) => {
  console.error('❌ unhandledRejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err);
  // En producción lo normal es apagar para no quedar inconsistente
  shutdown('uncaughtException');
});

startServer();
