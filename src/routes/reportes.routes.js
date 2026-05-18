const express = require('express');

const router = express.Router();

const controller =
  require('../controllers/reportes.controller');

const auth =
  require('../middleware/auth.middleware');

const {
  permitirRoles
} = require('../middleware/roles.middleware');


// ======================================================
// DASHBOARD REPORTES
// ======================================================

router.get(
  '/dashboard',
  auth,

  permitirRoles(
    'super_admin',
    'admin'
  ),

  controller.dashboard
);


module.exports = router;