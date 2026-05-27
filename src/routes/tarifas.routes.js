const express = require('express');
const router = express.Router();
const controller = require('../controllers/tarifas.controller');
const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

// Todas las rutas requieren autenticación y rol de admin/super_admin
router.use(auth);
router.use(permitirRoles('super_admin', 'admin'));

router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;