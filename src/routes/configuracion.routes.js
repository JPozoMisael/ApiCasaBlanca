const express = require('express');
const router = express.Router();
const controller = require('../controllers/configuracion.controller');
const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// Solo super_admin puede modificar configuración
router.post('/', permitirRoles('super_admin'), controller.crear);
router.put('/:clave', permitirRoles('super_admin'), controller.actualizar);

// Admin y super_admin pueden ver configuración
router.get('/', permitirRoles('super_admin', 'admin'), controller.listar);
router.get('/:clave', permitirRoles('super_admin', 'admin'), controller.obtenerPorClave);

module.exports = router;