const express = require('express');
const router = express.Router();

const controller = require('../controllers/hoteles.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearHotelSchema, actualizarHotelSchema } = require('../validators/hotel.schema');

// Público
router.get('/', controller.listar);
router.get('/:id', controller.obtenerPorId);

// Protegido
router.post('/', auth, roles('admin'), validate(crearHotelSchema), controller.crear);
router.put('/:id', auth, roles('admin'), validate(actualizarHotelSchema), controller.actualizar);
router.delete('/:id', auth, roles('admin'), controller.eliminar);

module.exports = router;