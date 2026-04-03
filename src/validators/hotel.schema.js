const Joi = require('joi');

const crearHotelSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).trim().required(),
  descripcion: Joi.string().allow('', null),
  direccion: Joi.string().max(200).allow('', null),
  ciudad: Joi.string().min(2).max(50).trim().required(),
  pais: Joi.string().min(2).max(50).trim().required(),
  telefono: Joi.string().max(20).allow('', null),
  email: Joi.string().email().max(100).trim().lowercase().allow('', null),
  estrellas: Joi.number().integer().min(1).max(5).allow(null),
}).unknown(false);

const actualizarHotelSchema = crearHotelSchema.fork(
  ['nombre', 'ciudad', 'pais'],
  (f) => f.optional()
);

module.exports = { crearHotelSchema, actualizarHotelSchema };