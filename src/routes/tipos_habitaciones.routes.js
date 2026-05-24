const express = require('express');
const router = express.Router();

const controller = require('../controllers/tipos_habitacion.controller');

const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

const validate = require('../middleware/validate.middleware');
const {
  crearTipoHabitacionSchema,
  actualizarTipoHabitacionSchema
} = require('../validators/tipos_habitacion.schema');

// ======================================================
// PUBLICO
// ======================================================

// =========================================
// LISTAR
// =========================================
router.get(
  '/',
  controller.listar
);

// =========================================
// OBTENER POR ID
// =========================================
router.get(
  '/:id',
  controller.obtenerPorId
);

// ======================================================
// PROTEGIDO
// ======================================================

// =========================================
// CREAR
// =========================================
router.post(
  '/',
  auth,  // Ahora es función válida
  permitirRoles('super_admin', 'admin', 'recepcion'),
  validate(crearTipoHabitacionSchema),
  controller.crear
);

// =========================================
// ACTUALIZAR
// =========================================
router.put(
  '/:id',
  auth, 
  permitirRoles('super_admin', 'admin', 'recepcion'),
  validate(actualizarTipoHabitacionSchema),
  controller.actualizar
);

// =========================================
// ELIMINAR
// =========================================
router.delete(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin'),
  controller.eliminar
);

module.exports = router;