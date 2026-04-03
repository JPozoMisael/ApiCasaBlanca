const express = require('express');
const router = express.Router();

const controller = require('../controllers/habitaciones.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearHabitacionSchema, actualizarHabitacionSchema } = require('../validators/habitaciones.schema');

// Público
router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

// Protegido
router.post('/', auth, roles('admin', 'empleado'), validate(crearHabitacionSchema), controller.crear);
router.put('/:id', auth, roles('admin', 'empleado'), validate(actualizarHabitacionSchema), controller.actualizar);
router.delete('/:id', auth, roles('admin'), controller.eliminar);

module.exports = router;