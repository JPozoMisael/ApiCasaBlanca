const Joi = require('joi');

const crearHabitacionSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().required(),
  tipo_habitacion_id: Joi.number().integer().positive().required(),
  numero_habitacion: Joi.string().max(10).required(),
  piso: Joi.number().integer().min(0).max(200).allow(null),
  estado: Joi.string()
    .valid('disponible', 'ocupada', 'mantenimiento', 'limpieza')
    .default('disponible'),
});

const actualizarHabitacionSchema = Joi.object({
  hotel_id: Joi.number().integer().positive().optional(),
  tipo_habitacion_id: Joi.number().integer().positive().optional(),
  numero_habitacion: Joi.string().max(10).optional(),
  piso: Joi.number().integer().min(0).max(200).allow(null).optional(),
  estado: Joi.string()
    .valid('disponible', 'ocupada', 'mantenimiento', 'limpieza')
    .optional(),
}).min(1);

module.exports = { crearHabitacionSchema, actualizarHabitacionSchema };
