const express = require('express');
const router = express.Router();

const controller = require('../controllers/habitaciones.controller');

// ✅ CORREGIDO: Importar auth como función
const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

const validate = require('../middleware/validate.middleware');
const {
  crearHabitacionSchema,
  actualizarHabitacionSchema
} = require('../validators/habitaciones.schema');

// ======================================================
// PUBLICO
// ======================================================

// =========================================
// DISPONIBLES
// =========================================
router.get(
  '/disponibles',
  controller.obtenerDisponibles
);

// =========================================
// HABITACIONES POR HOTEL
// =========================================
router.get(
  '/hotel/:slug',
  controller.obtenerPorHotel
);

// =========================================
// REVIEWS
// =========================================
router.get(
  '/reviews/:hotelId',
  controller.obtenerReviews
);

// =========================================
// CREAR REVIEW
// =========================================
router.post(
  '/reviews',
  controller.crearReview
);

// =========================================
// LISTAR
// =========================================
router.get(
  '/',
  controller.listar
);

// =========================================
// DESTACADAS
// =========================================
router.get(
  '/featured',
  controller.destacadas
);

// =========================================
// DETALLE
// SIEMPRE AL FINAL
// =========================================
router.get(
  '/:id',
  controller.obtenerPorId
);

// ======================================================
// PROTEGIDO
// ======================================================

// =========================================
// CREAR HABITACIÓN
// =========================================
router.post(
  '/',
  auth,  // ✅ Ahora es función válida
  permitirRoles('super_admin', 'admin', 'recepcion'),
  validate(crearHabitacionSchema),
  controller.crear
);

// =========================================
// ACTUALIZAR HABITACIÓN
// =========================================
router.put(
  '/:id',
  auth,  // ✅ Ahora es función válida
  permitirRoles('super_admin', 'admin', 'recepcion'),
  validate(actualizarHabitacionSchema),
  controller.actualizar
);

// =========================================
// ELIMINAR HABITACIÓN
// =========================================
router.delete(
  '/:id',
  auth,  // ✅ Ahora es función válida
  permitirRoles('super_admin', 'admin'),
  controller.eliminar
);

module.exports = router;