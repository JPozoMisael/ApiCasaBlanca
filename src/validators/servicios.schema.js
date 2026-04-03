const Joi = require('joi');

const crearServicioSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().required(),
  nombre: Joi.string().min(2).max(100).trim().required(),
  descripcion: Joi.string().allow('', null),
  precio: Joi.number().min(0).required(),
  tipo: Joi.string().valid('habitacion', 'reserva', 'general').default('reserva'),
  esta_activo: Joi.boolean().default(true),
}).unknown(false);

const actualizarServicioSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().optional(),
  nombre: Joi.string().min(2).max(100).trim().optional(),
  descripcion: Joi.string().allow('', null).optional(),
  precio: Joi.number().min(0).optional(),
  tipo: Joi.string().valid('habitacion', 'reserva', 'general').optional(),
  esta_activo: Joi.boolean().optional(),
}).min(1).unknown(false);

module.exports = { crearServicioSchema, actualizarServicioSchema };