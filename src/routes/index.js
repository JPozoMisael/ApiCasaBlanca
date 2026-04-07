const express = require('express');

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const hotelesRoutes = require('./hoteles.routes');
const tiposHabitacionRoutes = require('./tipos_habitaciones.routes');
const habitacionesRoutes = require('./habitaciones.routes');
const clientesRoutes = require('./clientes.routes');
const reservasRoutes = require('./reservas.routes');
const pagosRoutes = require('./pagos.routes');
const serviciosRoutes = require('./servicios.routes');
const reportesRoutes = require('./reportes.routes');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| API INFO
|--------------------------------------------------------------------------
*/

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'API Casa Blanca v1',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      hotels: '/hotels',
      rooms: '/rooms',
      roomTypes: '/room-types',
      clients: '/clients',
      bookings: '/bookings',
      payments: '/payments',
      services: '/services',
      reports: '/reports',
      admin: '/admin',
    },
  });
});

/*
|--------------------------------------------------------------------------
| MAIN ROUTES (ENGLISH STANDARD)
|--------------------------------------------------------------------------
*/

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

// CORE
router.use('/hotels', hotelesRoutes);
router.use('/rooms', habitacionesRoutes);
router.use('/room-types', tiposHabitacionRoutes);

// BUSINESS
router.use('/clients', clientesRoutes);
router.use('/bookings', reservasRoutes);
router.use('/payments', pagosRoutes);

// EXTRA
router.use('/services', serviciosRoutes);
router.use('/reports', reportesRoutes);

module.exports = router;