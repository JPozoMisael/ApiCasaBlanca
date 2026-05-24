const express = require('express');
const router = express.Router();

const controller = require('../controllers/reservas.controller');

const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

const validate = require('../middleware/validate.middleware');
const {
  crearReservaSchema,
  actualizarReservaSchema
} = require('../validators/reservas.schema');

// ======================================================
// PUBLICO (BOOKING)
// ======================================================

// =========================================
// CREAR RESERVA
// =========================================
router.post(
  '/',
  validate(crearReservaSchema),
  controller.crear
);

// ======================================================
// PROTEGIDO
// ======================================================

// =========================================
// LISTAR RESERVAS
// =========================================
router.get(
  '/',
  auth, 
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.listar
);

// =========================================
// OBTENER RESERVA POR ID
// =========================================
router.get(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.obtenerPorId
);

// =========================================
// ACTUALIZAR RESERVA
// =========================================
router.put(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin', 'recepcion'),
  validate(actualizarReservaSchema),
  controller.actualizar
);

// =========================================
// CANCELAR RESERVA
// =========================================
router.patch(
  '/:id/cancelar',
  auth,  
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.cancelar
);

module.exports = router;