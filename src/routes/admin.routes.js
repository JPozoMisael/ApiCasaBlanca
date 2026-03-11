const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearUsuarioSchema, cambiarRolSchema } = require('../validators/admin.schema');

router.get('/dashboard', auth, roles('admin', 'empleado'), adminController.dashboard);

router.get('/usuarios', auth, roles('admin'), adminController.listarUsuarios);
router.post('/usuarios', auth, roles('admin'), validate(crearUsuarioSchema), adminController.crearUsuario);
router.patch('/usuarios/:id/rol', auth, roles('admin'), validate(cambiarRolSchema), adminController.cambiarRol);

module.exports = router;
