const rateLimit = require('express-rate-limit');

const limiterBasico = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes, intenta más tarde' },
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos de login, intenta más tarde' },
});

module.exports = { limiterBasico, limiterLogin };
