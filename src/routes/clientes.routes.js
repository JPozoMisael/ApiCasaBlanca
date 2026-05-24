const express = require('express');
const router = express.Router();

const controller = require('../controllers/clientes.controller');

const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

// ======================================================
// LISTAR CLIENTES
// ======================================================
router.get(
  '/',
  auth,
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.listar
);

// ======================================================
// OBTENER CLIENTE POR ID
// ======================================================
router.get(
  '/:id',
  auth, 
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.obtenerPorId
);

// ======================================================
// CREAR CLIENTE
// ======================================================
router.post(
  '/',
  auth,  
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.crear
);

// ======================================================
// ACTUALIZAR CLIENTE
// ======================================================
router.put(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.actualizar
);

// ======================================================
// ELIMINAR CLIENTE
// ======================================================
router.delete(
  '/:id',
  auth,  
  permitirRoles('super_admin', 'admin'),
  controller.eliminar
);

module.exports = router;