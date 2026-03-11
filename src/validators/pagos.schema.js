const Joi = require('joi');

const crearPagoSchema = Joi.object({
  reserva_id: Joi.number().integer().positive().required(),
  monto: Joi.number().positive().required(),
  metodo: Joi.string().valid('tarjeta', 'efectivo', 'transferencia', 'paypal').required(),
  estado: Joi.string().valid('pendiente', 'completado', 'fallido').default('pendiente'),
});

const confirmarPagoSchema = Joi.object({
  reserva_id: Joi.number().integer().positive().required(),
  monto: Joi.number().positive().required(),
  metodo: Joi.string().valid('tarjeta', 'efectivo', 'transferencia', 'paypal').required(),
});

module.exports = { crearPagoSchema, confirmarPagoSchema };
