const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { limiterBasico } = require('./middleware/rateLimit.middleware');

const app = express();

/*
|--------------------------------------------------------------------------
| Configuracion base
|--------------------------------------------------------------------------
*/

// Limite para JSON
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// CORS controlado por variable de entorno
// Ejemplo:
// CORS_ORIGINS=http://localhost:8100,https://tudominio.com
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
      // Permitir requests sin Origin:
      // Postman, aplicaciones moviles o llamadas servidor a servidor
      if (!origin) return callback(null, true);

      // Permitir todos los origenes si se definio "*"
      if (allowedOrigins === '*') return callback(null, true);

      // Validar origen permitido
      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error('CORS: Origen no permitido'), false);
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

// Healthcheck para monitoreo
app.get('/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'API Casa Blanca',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Ruta raiz
app.get('/', (req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'API Casa Blanca funcionando',
    health: '/health',
  });
});

// Prefijo versionado de API
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