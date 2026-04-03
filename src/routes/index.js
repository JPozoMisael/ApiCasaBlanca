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
| Info API
|--------------------------------------------------------------------------
*/

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'API Casa Blanca v1',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      hoteles: '/hoteles',
      habitaciones: '/habitaciones',
      reservas: '/reservas',
      pagos: '/pagos',
      servicios: '/servicios',
      reportes: '/reportes',
    },
  });
});

/*
|--------------------------------------------------------------------------
| Rutas principales
|--------------------------------------------------------------------------
*/

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

router.use('/hoteles', hotelesRoutes);
router.use('/tipos-habitaciones', tiposHabitacionRoutes); // 🔥 corregido
router.use('/habitaciones', habitacionesRoutes);

router.use('/clientes', clientesRoutes);
router.use('/reservas', reservasRoutes);
router.use('/pagos', pagosRoutes);

router.use('/servicios', serviciosRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;