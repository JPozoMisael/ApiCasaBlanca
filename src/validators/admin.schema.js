const Joi = require('joi');

const crearUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  apellido: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().max(100).required(),
  password: Joi.string().min(6).max(100).required(),
  rol: Joi.string().valid('admin', 'empleado').default('empleado'),
  esta_activo: Joi.boolean().default(true),
});

const cambiarRolSchema = Joi.object({
  rol: Joi.string().valid('admin', 'empleado').required(),
});

module.exports = { crearUsuarioSchema, cambiarRolSchema };
