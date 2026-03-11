const Joi = require('joi');

const crearHotelSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  descripcion: Joi.string().allow('', null),
  direccion: Joi.string().max(200).allow('', null),
  ciudad: Joi.string().min(2).max(50).required(),
  pais: Joi.string().min(2).max(50).required(),
  telefono: Joi.string().max(20).allow('', null),
  email: Joi.string().email().max(100).allow('', null),
  estrellas: Joi.number().integer().min(1).max(5).allow(null),
});

const actualizarHotelSchema = crearHotelSchema.fork(
  ['nombre', 'ciudad', 'pais'],
  (f) => f.optional()
);

module.exports = { crearHotelSchema, actualizarHotelSchema };
