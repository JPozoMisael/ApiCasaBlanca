const express = require('express');

const router = express.Router();

const controller =
  require('../controllers/admin.controller');

const auth =
  require('../middleware/auth.middleware');

const {
  permitirRoles
} = require('../middleware/roles.middleware');


// =========================================
// PROTEGER TODO ADMIN
// =========================================

router.use(auth);


// =========================================
// DASHBOARD PRINCIPAL
// =========================================

router.get(

  '/dashboard',

  permitirRoles(
    'super_admin',
    'admin'
  ),

  controller.dashboard
);


// =========================================
// STATS DASHBOARD
// =========================================

router.get(

  '/dashboard/stats',

  permitirRoles(
    'super_admin',
    'admin'
  ),

  controller.dashboardStats
);


// =========================================
// RESERVAS DEL DÍA
// =========================================

router.get(

  '/dashboard/today-bookings',

  permitirRoles(
    'super_admin',
    'admin',
    'recepcion'
  ),

  controller.todayBookings
);


// =========================================
// LISTAR USUARIOS
// =========================================

router.get(

  '/usuarios',

  permitirRoles(
    'super_admin',
    'admin'
  ),

  controller.listarUsuarios
);


// =========================================
// CREAR USUARIO
// =========================================

router.post(

  '/usuarios',

  permitirRoles(
    'super_admin',
    'admin'
  ),

  controller.crearUsuario
);


// =========================================
// CAMBIAR ROL
// =========================================

router.patch(

  '/usuarios/:id/rol',

  permitirRoles(
    'super_admin'
  ),

  controller.cambiarRol
);


module.exports = router;