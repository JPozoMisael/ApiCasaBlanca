const express = require('express');
const router = express.Router();
const controller = require('../controllers/reservas.controller');
const { auth } = require('../middleware/auth.middleware');
const { permitirRoles } = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearReservaSchema, actualizarReservaSchema } = require('../validators/reservas.schema');

// Público
router.post('/', validate(crearReservaSchema), controller.crear);

// Protegido
router.get('/', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.listar);
router.get('/:id', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.obtenerPorId);
router.put('/:id', auth, permitirRoles('super_admin', 'admin', 'recepcion'), validate(actualizarReservaSchema), controller.actualizar);
router.patch('/:id/cancelar', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.cancelar);

// Check-in / Check-out
router.patch('/:id/checkin', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.realizarCheckIn);
router.patch('/:id/checkout', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.realizarCheckOut);
router.patch('/:id/estado', auth, permitirRoles('super_admin', 'admin', 'recepcion'), controller.actualizarEstado);

module.exports = router;