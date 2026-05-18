const express = require('express');

const router = express.Router();

const controller =
  require('../controllers/pagos.controller');

const auth =
  require('../middleware/auth.middleware');

const {
  permitirRoles
} = require('../middleware/roles.middleware');

const validate =
  require('../middleware/validate.middleware');

const {
  crearPagoSchema
} = require('../validators/pagos.schema');


// ======================================================
// LISTAR PAGOS
// ======================================================

router.get(
  '/',
  auth,

  permitirRoles(
    'super_admin',
    'admin',
    'recepcion'
  ),

  controller.listarPorReserva
);


// ======================================================
// CREAR PAGO
// ======================================================

router.post(
  '/',
  auth,

  permitirRoles(
    'super_admin',
    'admin',
    'recepcion'
  ),

  validate(crearPagoSchema),

  controller.crear
);


// ======================================================
// CREAR Y CONFIRMAR PAGO
// ======================================================

router.post(
  '/confirmar',
  auth,

  permitirRoles(
    'super_admin',
    'admin',
    'recepcion'
  ),

  controller.crearYConfirmar
);


module.exports = router;