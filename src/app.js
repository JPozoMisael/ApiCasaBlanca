const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { limiterBasico } = require('./middleware/rateLimit.middleware');
const { applyAssociations } = require('./models');
applyAssociations();

const app = express();

/*
|--------------------------------------------------------------------------
| Seguridad base
|--------------------------------------------------------------------------
*/

// Protege headers HTTP
app.use(helmet());

// Logs solo en desarrollo
if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {
  app.use(morgan('dev'));
}

/*
|--------------------------------------------------------------------------
| Configuracion base
|--------------------------------------------------------------------------
*/

// Limite JSON
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// CORS dinámico
const rawOrigins = process.env.CORS_ORIGINS || '*';

const allowedOrigins =
  rawOrigins === '*'
    ? '*'
    : rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins === '*') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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
| Rutas base
|--------------------------------------------------------------------------
*/

// Healthcheck
app.get('/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'API Casa Blanca',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get('/', (req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'API Casa Blanca funcionando',
    health: '/health',
  });
});

// Prefijo versionado
const API_PREFIX = '/api/v1';

// Rutas principales
app.use(API_PREFIX, routes);

/*
|--------------------------------------------------------------------------
| Manejo global de errores
|--------------------------------------------------------------------------
*/

app.use(notFound);
app.use(errorHandler);

module.exports = app;