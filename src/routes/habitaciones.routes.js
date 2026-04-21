const express = require('express');
const router = express.Router();

const controller = require('../controllers/habitaciones.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const {
  crearHabitacionSchema,
  actualizarHabitacionSchema
} = require('../validators/habitaciones.schema');

// ================= PUBLICO =================

// 🔥 NUEVA RUTA (CLAVE)
router.get('/disponibles', controller.obtenerDisponibles);

// IMPORTANTE: rutas específicas antes de dinámicas
router.get('/hotel/:slug', controller.obtenerPorHotel);

router.get('/', controller.listar);

router.get('/:id', controller.obtenerPorId);
router.get('/reviews/:hotelId', controller.obtenerReviews);
router.post('/reviews', controller.crearReview);
// ================= PROTEGIDO =================

router.post(
  '/',
  auth,
  roles('admin', 'empleado'),
  validate(crearHabitacionSchema),
  controller.crear
);

router.put(
  '/:id',
  auth,
  roles('admin', 'empleado'),
  validate(actualizarHabitacionSchema),
  controller.actualizar
);

router.delete(
  '/:id',
  auth,
  roles('admin'),
  controller.eliminar
);

module.exports = router;