const express = require('express');

const router = express.Router();

const controller = require('../controllers/admin.controller');

const auth =
  require('../middleware/auth.middleware');

const {
  permitirRoles
} = require('../middleware/roles.middleware');

router.use(auth);

// DASHBOARD
router.get(
  '/dashboard',
  permitirRoles(
    'super_admin',
    'admin'
  ),
  controller.dashboard
);


// LISTAR USUARIOS
router.get(
  '/usuarios',
  permitirRoles(
    'super_admin',
    'admin'
  ),
  controller.listarUsuarios
);


// CREAR USUARIO
router.post(
  '/usuarios',
  permitirRoles(
    'super_admin',
    'admin'
  ),
  controller.crearUsuario
);

// CAMBIAR ROL
router.patch(
  '/usuarios/:id/rol',
  permitirRoles(
    'super_admin'
  ),
  controller.cambiarRol
);


module.exports = router;