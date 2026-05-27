const express = require('express');
const router = express.Router();

const controller = require('../controllers/servicios.controller');

const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

const validate = require('../middleware/validate.middleware');
const {
  crearServicioSchema,
  actualizarServicioSchema
} = require('../validators/servicios.schema');



// =========================================
// LISTAR SERVICIOS
// =========================================
router.get(
  '/',
  controller.listar
);

// =========================================
// OBTENER SERVICIO POR ID
// =========================================
router.get(
  '/:id',
  controller.obtenerPorId
);

// =========================================
// CREAR SERVICIO
// =========================================
router.post(
  '/',
  auth, 
  permitirRoles('super_admin', 'admin'),
  validate(crearServicioSchema),
  controller.crear
);

// =========================================
// ACTUALIZAR SERVICIO
// =========================================
router.put(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin'),
  validate(actualizarServicioSchema),
  controller.actualizar
);

// =========================================
// ELIMINAR SERVICIO
// =========================================
router.delete(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin'),
  controller.eliminar
);

module.exports = router;