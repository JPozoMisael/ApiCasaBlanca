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

// 🔥 SIEMPRE AL FINAL
router.get('/:id', controller.obtenerPorId);

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