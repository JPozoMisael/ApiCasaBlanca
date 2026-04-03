const express = require('express');
const router = express.Router();

const controller = require('../controllers/reservas.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');

const {
  crearReservaSchema,
  actualizarReservaSchema
} = require('../validators/reservas.schema');

// Público (tipo Booking)
router.post('/', validate(crearReservaSchema), controller.crear);

// Protegido
router.get('/', auth, roles('admin', 'empleado'), controller.listar);

router.get('/:id', auth, roles('admin', 'empleado'), controller.obtenerPorId);

router.put('/:id',
  auth,
  roles('admin', 'empleado'),
  validate(actualizarReservaSchema),
  controller.actualizar
);

router.patch('/:id/cancelar',
  auth,
  roles('admin', 'empleado'),
  controller.cancelar
);

module.exports = router;