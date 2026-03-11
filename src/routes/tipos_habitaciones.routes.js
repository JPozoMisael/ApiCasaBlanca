const express = require('express');
const router = express.Router();

const controller = require('../controllers/tipos_habitacion.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearTipoHabitacionSchema, actualizarTipoHabitacionSchema } = require('../validators/tipos_habitacion.schema');

router.get('/', controller.listarPorHotel); // ?hotel_id=1
router.get('/:id', controller.obtenerPorId);

router.post('/', auth, roles('admin'), validate(crearTipoHabitacionSchema), controller.crear);
router.put('/:id', auth, roles('admin'), validate(actualizarTipoHabitacionSchema), controller.actualizar);
router.delete('/:id', auth, roles('admin'), controller.eliminar);

module.exports = router;
