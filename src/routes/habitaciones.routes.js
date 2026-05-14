const express = require('express');
const router = express.Router();
const controller =
  require('../controllers/habitaciones.controller');
const auth =
  require('../middleware/auth.middleware');
const roles =
  require('../middleware/roles.middleware');
const validate =
  require('../middleware/validate.middleware');
const {
  crearHabitacionSchema,
  actualizarHabitacionSchema
} = require('../validators/habitaciones.schema');

// ======================================================
// PUBLICO
// ======================================================

// DISPONIBLES
router.get(
  '/disponibles',
  controller.obtenerDisponibles
);

// HABITACIONES POR HOTEL
router.get(
  '/hotel/:slug',
  controller.obtenerPorHotel
);

// REVIEWS
router.get(
  '/reviews/:hotelId',
  controller.obtenerReviews
);

// CREAR REVIEW
router.post(
  '/reviews',
  controller.crearReview
);

// LISTAR
router.get(
  '/',
  controller.listar
);

router.get(
  '/featured',
  controller.destacadas
);
// DETALLE
// SIEMPRE AL FINAL
router.get(
  '/:id',
  controller.obtenerPorId
);

// ======================================================
// PROTEGIDO
// ======================================================

// CREAR
router.post(
  '/',
  auth,
  roles('admin', 'empleado'),
  validate(crearHabitacionSchema),
  controller.crear
);

// ACTUALIZAR
router.put(
  '/:id',
  auth,
  roles('admin', 'empleado'),
  validate(actualizarHabitacionSchema),
  controller.actualizar
);

// ELIMINAR
router.delete(
  '/:id',
  auth,
  roles('admin'),
  controller.eliminar
);

module.exports = router;