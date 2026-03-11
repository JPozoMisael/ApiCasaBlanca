const Joi = require('joi');

const crearTipoHabitacionSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().required(),
  nombre: Joi.string().min(2).max(50).required(),
  descripcion: Joi.string().allow('', null),
  capacidad_maxima: Joi.number().integer().min(1).max(20).required(),
  metros_cuadrados: Joi.number().min(0).allow(null),
  camas_sencillas: Joi.number().integer().min(0).max(10).default(0),
  camas_dobles: Joi.number().integer().min(0).max(10).default(0),
  tiene_vista: Joi.boolean().default(false),
  tiene_balcon: Joi.boolean().default(false),
  precio_base: Joi.number().min(0).required(),
}).unknown(true); // por si tu tabla tiene campos extra

const actualizarTipoHabitacionSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().optional(),
  nombre: Joi.string().min(2).max(50).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  capacidad_maxima: Joi.number().integer().min(1).max(20).optional(),
  metros_cuadrados: Joi.number().min(0).allow(null).optional(),
  camas_sencillas: Joi.number().integer().min(0).max(10).optional(),
  camas_dobles: Joi.number().integer().min(0).max(10).optional(),
  tiene_vista: Joi.boolean().optional(),
  tiene_balcon: Joi.boolean().optional(),
  precio_base: Joi.number().min(0).optional(),
}).min(1).unknown(true);

module.exports = { crearTipoHabitacionSchema, actualizarTipoHabitacionSchema };
