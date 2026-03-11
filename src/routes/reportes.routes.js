const express = require('express');
const router = express.Router();

const controller = require('../controllers/reportes.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');

router.get('/reservas-mes', auth, roles('admin', 'empleado'), controller.reservasPorMes);
router.get('/ingresos-mes', auth, roles('admin', 'empleado'), controller.ingresosPorMes);
router.get('/ocupacion', auth, roles('admin', 'empleado'), controller.ocupacionHabitaciones);

module.exports = router;
