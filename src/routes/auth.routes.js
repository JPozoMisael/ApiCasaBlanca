const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');

const validate = require('../middleware/validate.middleware');

const { limiterLogin } = require('../middleware/rateLimit.middleware');

const {
  loginSchema,
  registerSchema
} = require('../validators/auth.schema');

// LOGIN
router.post(
  '/login',
  limiterLogin,
  validate(loginSchema),
  controller.login
);

// REGISTER
router.post(
  '/register',
  validate(registerSchema),
  controller.register
);

module.exports = router;