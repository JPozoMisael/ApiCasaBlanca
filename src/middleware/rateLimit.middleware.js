const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const crearLimitador = ({ windowMs, max, message, skip }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { ok: false, message },
    // En tests no queremos límites.
    skip: (req) => process.env.NODE_ENV === 'test' || (skip ? skip(req) : false),
  });

// SiteMinder empuja disponibilidad y tarifas de todos los hoteles desde pocas IP: el endpoint del canal
// se protege con WS-Security, no con este límite por IP.
const limiterBasico = crearLimitador({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Demasiadas solicitudes, intenta más tarde',
  skip: (req) => req.path.startsWith('/api/v1/channels/siteminder'),
});

const limiterLogin = crearLimitador({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos de login, intenta más tarde',
});

// Crear reservas anónimas bloquea inventario: límite más estricto. Las peticiones con sesión
// (personal de recepción detrás de una misma IP) no comparten este contador; su token se valida
// después en authOpcional, así que una cabecera falsa solo produce un 401.
const limiterReservas = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Has creado demasiadas reservas en poco tiempo, intenta más tarde',
  skip: (req) => Boolean(req.headers.authorization),
});

// Consultas/cancelaciones por código + correo: contador propio, para no consumir el de reservas.
const limiterConsulta = crearLimitador({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: 'Demasiadas consultas, intenta más tarde',
});

module.exports = { limiterBasico, limiterLogin, limiterReservas, limiterConsulta };
