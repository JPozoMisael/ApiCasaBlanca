const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { limiterLogin } = require('../middleware/rateLimit.middleware');
const { loginSchema } = require('../validators/auth.schema');

router.post('/login', limiterLogin, validate(loginSchema), controller.login);

module.exports = router;