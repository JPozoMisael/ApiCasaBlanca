const Joi = require('joi');

const crearUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).trim().required(),
  apellido: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().max(100).trim().lowercase().required(),
  password: Joi.string().min(6).max(100).required(),
  rol: Joi.string().valid('admin', 'empleado', 'cliente').default('empleado'),
  esta_activo: Joi.boolean().default(true),
}).unknown(false);

const cambiarRolSchema = Joi.object({
  rol: Joi.string().valid('admin', 'empleado', 'cliente').required(),
}).unknown(false);

module.exports = { crearUsuarioSchema, cambiarRolSchema };