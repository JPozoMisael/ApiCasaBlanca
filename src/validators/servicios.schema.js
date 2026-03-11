const Joi = require('joi');

const crearServicioSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().required(),
  nombre: Joi.string().min(2).max(100).required(),
  descripcion: Joi.string().allow('', null),
  precio: Joi.number().min(0).required(),
  tipo: Joi.string().valid('habitacion', 'reserva', 'general').default('reserva'),
  esta_activo: Joi.boolean().default(true),
});

const actualizarServicioSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().optional(),
  nombre: Joi.string().min(2).max(100).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  precio: Joi.number().min(0).optional(),
  tipo: Joi.string().valid('habitacion', 'reserva', 'general').optional(),
  esta_activo: Joi.boolean().optional(),
}).min(1);

module.exports = { crearServicioSchema, actualizarServicioSchema };
