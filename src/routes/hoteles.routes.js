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


router.get(
  '/featured',
  controller.destacado
);


router.get(
  '/resumen',
  controller.resumen
);


router.get(
  '/slug/:slug',
  controller.obtenerPorSlug
);


router.get(
  '/',
  controller.listar
);


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