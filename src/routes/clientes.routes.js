const express = require('express');
const router = express.Router();

const controller = require('../controllers/clientes.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');

router.get('/', auth, roles('admin', 'empleado'), controller.listar);
router.get('/:id', auth, roles('admin', 'empleado'), controller.obtenerPorId);

router.post('/', auth, roles('admin', 'empleado'), controller.crear);
router.put('/:id', auth, roles('admin', 'empleado'), controller.actualizar);
router.delete('/:id', auth, roles('admin'), controller.eliminar);

module.exports = router;