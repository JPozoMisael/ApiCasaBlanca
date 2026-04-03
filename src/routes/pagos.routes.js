const express = require('express');
const router = express.Router();

const controller = require('../controllers/pagos.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { crearPagoSchema } = require('../validators/pagos.schema');

router.get('/', auth, roles('admin', 'empleado'), controller.listarPorReserva);

router.post(
  '/',
  auth,
  roles('admin', 'empleado'),
  validate(crearPagoSchema),
  controller.crear
);

router.post(
  '/confirmar',
  auth,
  roles('admin', 'empleado'),
  controller.crearYConfirmar
);

module.exports = router;