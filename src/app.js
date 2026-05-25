const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { limiterBasico } = require('./middleware/rateLimit.middleware');
const { applyAssociations } = require('./models');
const { sequelize } = require('./config/db');
const models = require('./models');

applyAssociations();

const app = express();

/*
|--------------------------------------------------------------------------
| SEGURIDAD
|--------------------------------------------------------------------------
*/

// Headers seguros
app.use(helmet());

// Logs (solo desarrollo)
if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {
  app.use(morgan('dev'));
}

/*
|--------------------------------------------------------------------------
| CONFIG BASE
|--------------------------------------------------------------------------
*/

// JSON
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// ================= CORS =================

const rawOrigins = process.env.CORS_ORIGINS || '*';

const allowedOrigins =
  rawOrigins === '*'
    ? '*'
    : rawOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir Postman / server-side
      if (!origin) return callback(null, true);

      if (allowedOrigins === '*') return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('CORS bloqueado:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limit global
app.use(limiterBasico);

/*
|--------------------------------------------------------------------------
| HEALTH + ROOT + TEST
|--------------------------------------------------------------------------
*/

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'API Casa Blanca',
    version: 'v1',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API Casa Blanca funcionando',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      testDb: '/test-db',
      testUsers: '/test-users',
    },
  });
});

// =============================================
// ENDPOINTS DE PRUEBA PARA DEPURAR CONEXIÓN
// =============================================

// Probar conexión a la base de datos
app.get('/test-db', async (req, res) => {
  try {
    const [result] = await sequelize.query('SELECT 1+1 AS resultado');
    res.status(200).json({ 
      ok: true, 
      message: 'Conexión a BD exitosa', 
      data: result 
    });
  } catch (error) {
    console.error('Error en test-db:', error.message);
    res.status(500).json({ 
      ok: false, 
      message: error.message,
      details: error.parent ? error.parent.message : null
    });
  }
});

// Probar obtener usuarios de la tabla users
app.get('/test-users', async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: ['id', 'nombre', 'apellido', 'email', 'rol', 'estado']
    });
    res.status(200).json({ 
      ok: true, 
      total: users.length,
      users: users 
    });
  } catch (error) {
    console.error('Error en test-users:', error.message);
    res.status(500).json({ 
      ok: false, 
      message: error.message,
      details: error.parent ? error.parent.message : null
    });
  }
});

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

const API_PREFIX = '/api/v1';

app.use(API_PREFIX, routes);

/*
|--------------------------------------------------------------------------
| DEBUG (OPCIONAL PERO MUY ÚTIL)
|--------------------------------------------------------------------------
*/

// Log simple de rutas (solo dev)
if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {
  app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.originalUrl}`);
    next();
  });
}

/*
|--------------------------------------------------------------------------
| ERRORES
|--------------------------------------------------------------------------
*/

app.use(notFound);
app.use(errorHandler);

module.exports = app;