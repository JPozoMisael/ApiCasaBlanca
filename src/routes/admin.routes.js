const express = require('express');
const router = express.Router();

const controller = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');

// Todo admin protegido
router.use(auth, roles('admin'));

router.get('/dashboard', controller.dashboard);
router.get('/usuarios', controller.listarUsuarios);
router.post('/usuarios', controller.crearUsuario);
router.patch('/usuarios/:id/rol', controller.cambiarRol);

module.exports = router;