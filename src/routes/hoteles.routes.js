const express = require('express');

const router = express.Router();

const controller =
  require('../controllers/hoteles.controller');

const auth =
  require('../middleware/auth.middleware');

const roles =
  require('../middleware/roles.middleware');

const validate =
  require('../middleware/validate.middleware');

const {
  crearHotelSchema,
  actualizarHotelSchema
} = require('../validators/hotel.schema');

/* ======================================================
   PUBLIC
====================================================== */

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

/* ======================================================
   PROTEGIDO
====================================================== */

// CREAR
router.post(
  '/',
  auth,
  roles('admin'),
  validate(crearHotelSchema),
  controller.crear
);

// ACTUALIZAR
router.put(
  '/:id',
  auth,
  roles('admin'),
  validate(actualizarHotelSchema),
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