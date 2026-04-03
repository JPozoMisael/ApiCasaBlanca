const express = require('express');
const router = express.Router();

const controller = require('../controllers/reportes.controller');
const auth = require('../middleware/auth.middleware');
const roles = require('../middleware/roles.middleware');

router.get('/dashboard', auth, roles('admin'), controller.dashboard);

module.exports = router;