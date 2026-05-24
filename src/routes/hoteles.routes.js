const express = require('express');

const router = express.Router();

const controller =
  require('../controllers/hoteles.controller');

const { auth } = require('../middleware/auth.middleware');

const {
  permitirRoles
} = require('../middleware/roles.middleware');

const validate =
  require('../middleware/validate.middleware');

const {
  crearHotelSchema,
  actualizarHotelSchema
} = require('../validators/hotel.schema');


// ======================================================
// PUBLIC
// ======================================================


// 🔥 BOOKING HOME
router.get(
  '/featured',
  controller.destacado
);


// 🔥 RESUMEN HOTELES
router.get(
  '/resumen',
  controller.resumen
);


// 🔥 POR SLUG
router.get(
  '/slug/:slug',
  controller.obtenerPorSlug
);


// 🔥 LISTAR
router.get(
  '/',
  controller.listar
);


// 🔥 POR ID
router.get(
  '/:id',
  controller.obtenerPorId
);


// ======================================================
// PROTEGIDO
// ======================================================


// =========================================
// CREAR HOTEL
// =========================================

router.post(
  '/',
  auth,

  permitirRoles(
    'super_admin',
    'admin'
  ),

  validate(crearHotelSchema),

  controller.crear
);


// =========================================
// ACTUALIZAR HOTEL
// =========================================

router.put(
  '/:id',
  auth,

  permitirRoles(
    'super_admin',
    'admin'
  ),

  validate(actualizarHotelSchema),

  controller.actualizar
);


// =========================================
// ELIMINAR HOTEL
// =========================================

router.delete(
  '/:id',
  auth,

  permitirRoles(
    'super_admin'
  ),

  controller.eliminar
);


module.exports = router;