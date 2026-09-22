const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { limiterBasico } = require('./middleware/rateLimit.middleware');
const { applyAssociations } = require('./models');
const { APP_NAME } = require('./config/constants');

applyAssociations();

const app = express();
const env = (process.env.NODE_ENV || 'development').toLowerCase();

// Detrás de un proxy (Render, Nginx) para que rate-limit vea la IP real del cliente.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

app.use(helmet());
if (env === 'development') app.use(morgan('dev'));

app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

/* ---------- CORS ---------- */
const allowedOrigins = [
  'http://localhost:8100',
  'http://localhost:4200',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hotel-Id'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(limiterBasico);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: APP_NAME, version: 'v2', env, timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ ok: true, message: `${APP_NAME} API`, endpoints: { health: '/health', api: '/api/v1' } });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
