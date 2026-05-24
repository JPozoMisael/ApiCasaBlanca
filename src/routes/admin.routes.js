const express = require('express');
const router = express.Router();  // ✅ Esta línea es OBLIGATORIA
const controller = require('../controllers/admin.controller');

// ✅ IMPORTACIÓN CORRECTA
const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

// =========================================
// PROTEGER TODO ADMIN
// =========================================
router.use(auth);  // ✅ router ya está definido

// =========================================
// DASHBOARD PRINCIPAL
// =========================================
router.get(
  '/dashboard',
  permitirRoles('super_admin', 'admin'),
  controller.dashboard
);

router.get(
  '/dashboard/stats',
  permitirRoles('super_admin', 'admin'),
  controller.dashboardStats
);

router.get(
  '/dashboard/today-bookings',
  permitirRoles('super_admin', 'admin', 'recepcion'),
  controller.todayBookings
);

// =========================================
// USUARIOS
// =========================================
router.get(
  '/usuarios',
  permitirRoles('super_admin', 'admin'),
  controller.listarUsuarios
);

router.post(
  '/usuarios',
  permitirRoles('super_admin', 'admin'),
  controller.crearUsuario
);

router.patch(
  '/usuarios/:id/rol',
  permitirRoles('super_admin'),
  controller.cambiarRol
);

module.exports = router;