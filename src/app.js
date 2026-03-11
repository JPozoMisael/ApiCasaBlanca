// src/app.js
const express = require('express');
const cors = require('cors');

const routes = require('./routes'); // ✅ routes/index.js
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { limiterBasico } = require('./middleware/rateLimit.middleware');

const app = express();

/**
 * =========================================================
 * Configuración básica (producción)
 * =========================================================
 */

// 1) JSON con límite (evita payloads enormes)
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// 2) CORS controlado por entorno
// En .env puedes definir:
// CORS_ORIGINS=http://localhost:8100,https://tudominio.com
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
    origin: (origin, cb) => {
      // Permitir requests sin Origin (Postman, apps móviles, server-to-server)
      if (!origin) return cb(null, true);

      // Si se dejó '*' (modo abierto)
      if (allowedOrigins === '*') return cb(null, true);

      // Validar contra lista
      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error('CORS: Origen no permitido'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3) Rate limit global (básico)
app.use(limiterBasico);

/**
 * =========================================================
 * Rutas
 * =========================================================
 */

// Healthcheck (mejor que /)
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'API Casa Blanca',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Ruta simple (opcional)
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API Casa Blanca funcionando ✅', health: '/health' });
});

// Versionado API
const API_PREFIX = '/api/v1';

// ✅ Monta todas las rutas (auth, admin, hoteles, habitaciones, reservas, pagos, etc.)
app.use(API_PREFIX, routes);

/**
 * =========================================================
 * 404 + Error Handler Global
 * =========================================================
 */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
