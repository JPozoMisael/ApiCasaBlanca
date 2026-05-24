// src/routes/reportes.routes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');

// ✅ CORREGIDO: Ruta correcta (sin "s") y destructuring
const { auth, verificarRol } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas de reportes (solo admin y super_admin)
router.get('/dashboard', verificarRol(['admin', 'super_admin']), reportesController.dashboard);
router.get('/ocupacion', verificarRol(['admin', 'super_admin']), reportesController.ocupacion);
router.get('/ingresos', verificarRol(['admin', 'super_admin']), reportesController.ingresos);
router.get('/reservas/estado', verificarRol(['admin', 'super_admin']), reportesController.reservasPorEstado);
router.get('/hoteles/top', verificarRol(['admin', 'super_admin']), reportesController.hotelesTop);
router.get('/servicios/top', verificarRol(['admin', 'super_admin']), reportesController.serviciosTop);
router.get('/clientes/frecuentes', verificarRol(['admin', 'super_admin']), reportesController.clientesFrecuentes);
router.get('/cancelaciones', verificarRol(['admin', 'super_admin']), reportesController.cancelaciones);

module.exports = router;