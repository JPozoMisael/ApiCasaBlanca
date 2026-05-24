const express = require('express');
const router = express.Router();
const controller = require('../controllers/pagos.controller');

const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');

// ======================================================
// RUTAS PÚBLICAS
// ======================================================
router.get('/metodos', controller.metodosDisponibles);

// ======================================================
// RUTAS PROTEGIDAS
// ======================================================
router.get('/', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.listar);
router.get('/:id', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.obtenerPorId);
router.post('/stripe', auth, controller.iniciarPago);
router.post('/confirmar', controller.confirmarPago);

module.exports = router;