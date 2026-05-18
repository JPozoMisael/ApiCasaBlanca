const express = require('express');

const router = express.Router();


// ======================================================
// AUTH
// ======================================================

const authRoutes =
  require('./auth.routes');

const adminRoutes =
  require('./admin.routes');


// ======================================================
// CORE
// ======================================================

const hotelesRoutes =
  require('./hoteles.routes');

const habitacionesRoutes =
  require('./habitaciones.routes');

const tiposHabitacionRoutes =
  require('./tipos_habitacion.routes');


// ======================================================
// BUSINESS
// ======================================================

const clientesRoutes =
  require('./clientes.routes');

const reservasRoutes =
  require('./reservas.routes');

const pagosRoutes =
  require('./pagos.routes');


// ======================================================
// EXTRA
// ======================================================

const serviciosRoutes =
  require('./servicios.routes');

const reportesRoutes =
  require('./reportes.routes');


// ======================================================
// API INFO
// ======================================================

router.get('/', (req, res) => {

  return res.status(200).json({

    ok: true,

    message: 'API Casa Blanca v1',

    version: '1.0.0',

    endpoints: {

      auth: '/auth',

      admin: '/admin',

      hotels: '/hotels',

      rooms: '/rooms',

      roomTypes: '/room-types',

      clients: '/clients',

      bookings: '/bookings',

      payments: '/payments',

      services: '/services',

      reports: '/reports',
    },
  });
});


// ======================================================
// AUTH
// ======================================================

router.use(
  '/auth',
  authRoutes
);

router.use(
  '/admin',
  adminRoutes
);


// ======================================================
// CORE
// ======================================================

router.use(
  '/hotels',
  hotelesRoutes
);

router.use(
  '/rooms',
  habitacionesRoutes
);

router.use(
  '/room-types',
  tiposHabitacionRoutes
);


// ======================================================
// BUSINESS
// ======================================================

router.use(
  '/clients',
  clientesRoutes
);

router.use(
  '/bookings',
  reservasRoutes
);

router.use(
  '/payments',
  pagosRoutes
);


// ======================================================
// EXTRA
// ======================================================

router.use(
  '/services',
  serviciosRoutes
);

router.use(
  '/reports',
  reportesRoutes
);


module.exports = router;