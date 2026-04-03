const express = require('express');
const router = express.Router();

const controller = require('../controllers/tipos_habitacion.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const {
  crearTipoHabitacionSchema,
  actualizarTipoHabitacionSchema
} = require('../validators/tipos_habitacion.schema');

// Público
router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

// Protegido
router.post('/', auth, roles('admin', 'empleado'), validate(crearTipoHabitacionSchema), controller.crear);
router.put('/:id', auth, roles('admin', 'empleado'), validate(actualizarTipoHabitacionSchema), controller.actualizar);
router.delete('/:id', auth, roles('admin'), controller.eliminar);

module.exports = router;