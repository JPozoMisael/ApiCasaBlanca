const express = require('express');
const C = require('../config/constants');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: `API ${C.APP_NAME} v1`,
    version: '2.0.0',
    endpoints: {
      publico: ['/zonas', '/amenidades', '/search/hoteles', '/hotels/featured', '/hotels/:slug', '/hotels/:slug/availability', '/hotels/:slug/reviews'],
      reservas: ['/bookings/quote', '/bookings', '/bookings/lookup'],
      cuenta: ['/auth/login', '/auth/register', '/auth/me', '/reviews', '/favorites'],
      gestion_hotel: ['/manage/hotel', '/room-types', '/rooms', '/tarifas', '/temporadas', '/services', '/images', '/bloqueos', '/clients', '/payments', '/reports/*', '/admin/usuarios'],
      plataforma: ['/platform/stats', '/platform/hotels', '/platform/zonas'],
    },
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/bookings', require('./reservas.routes'));
router.use('/platform', require('./plataforma.routes'));
// Canal SiteMinder: el endpoint SOAP público primero; luego la administración del hotel.
router.use('/channels', require('./siteminder.routes'));
router.use('/channels', require('./canales.routes'));

// Rutas sin prefijo común: cada router declara sus paths completos.
router.use(require('./publico.routes'));
router.use(require('./cliente.routes'));
router.use(require('./gestion.routes'));

module.exports = router;
