const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');

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

app.use(helmet());

if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {
  app.use(morgan('dev'));
}

/*
|--------------------------------------------------------------------------
| CONFIG BASE
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: process.env.JSON_LIMIT || '1mb',
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  'http://localhost:8100',
  'http://localhost:4200',

  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir Postman y requests sin origin
    if (!origin) {
      return callback(null, true);
    }

    // Permitir dominios autorizados
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS bloqueado para origin: ${origin}`);

    return callback(
      new Error(`CORS no permitido para origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

/*
|--------------------------------------------------------------------------
| RATE LIMIT
|--------------------------------------------------------------------------
*/

app.use(limiterBasico);

/*
|--------------------------------------------------------------------------
| HEALTHCHECK
|--------------------------------------------------------------------------
*/

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'API Casa Blanca',
    version: 'v1',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'API Casa Blanca funcionando',
    endpoints: {
      health: '/health',
      api: '/api/v1',
    },
  });
});

/*
|--------------------------------------------------------------------------
| RUTAS DE TEST
|--------------------------------------------------------------------------
*/

if (process.env.ENABLE_TEST_ROUTES === 'true') {

  /*
  |--------------------------------------------------------------------------
  | TEST DB
  |--------------------------------------------------------------------------
  */

  app.get('/test-db', async (req, res) => {
    try {

      const [result] = await sequelize.query(
        'SELECT 1+1 AS resultado'
      );

      res.status(200).json({
        ok: true,
        message: 'Conexión a base de datos exitosa',
        data: result,
      });

    } catch (error) {

      console.error('Error en test-db:', error);

      res.status(500).json({
        ok: false,
        message: error.message,
        details: error.parent
          ? error.parent.message
          : null,
      });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | TEST USERS
  |--------------------------------------------------------------------------
  */

  app.get('/test-users', async (req, res) => {
    try {

      const users = await models.User.findAll({
        attributes: [
          'id',
          'nombre',
          'apellido',
          'email',
          'rol',
          'estado',
        ],
      });

      res.status(200).json({
        ok: true,
        total: users.length,
        users,
      });

    } catch (error) {

      console.error('Error en test-users:', error);

      res.status(500).json({
        ok: false,
        message: error.message,
        details: error.parent
          ? error.parent.message
          : null,
      });
    }
  });

  /*
  |--------------------------------------------------------------------------
  | UPDATE PASSWORD TEMPORAL
  |--------------------------------------------------------------------------
  */

  app.post('/test-update-password', async (req, res) => {

    try {

      const { email, newPassword } = req.body;

      if (!email || !newPassword) {

        return res.status(400).json({
          ok: false,
          message: 'Email y newPassword son requeridos',
        });
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        10
      );

      const [updated] = await models.User.update(
        {
          password: hashedPassword,
        },
        {
          where: {
            email,
          },
        }
      );

      if (!updated) {

        return res.status(404).json({
          ok: false,
          message: `Usuario ${email} no encontrado`,
        });
      }

      return res.status(200).json({
        ok: true,
        message: `Contraseña actualizada para ${email}`,
      });

    } catch (error) {

      console.error('Error update password:', error);

      return res.status(500).json({
        ok: false,
        message: error.message,
      });
    }
  });
}

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

const API_PREFIX = '/api/v1';

app.use(API_PREFIX, routes);

/*
|--------------------------------------------------------------------------
| DEBUG REQUESTS
|--------------------------------------------------------------------------
*/

if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {

  app.use((req, res, next) => {

    console.log(`${req.method} ${req.originalUrl}`);

    next();
  });
}

/*
|--------------------------------------------------------------------------
| NOT FOUND
|--------------------------------------------------------------------------
*/

app.use(notFound);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = app;