const Joi = require('joi');

const crearReservaSchema = Joi.object({
  cliente_id: Joi.number().integer().positive().required(),
  hotel_id: Joi.number().integer().positive().required(),

  fecha_entrada: Joi.string().isoDate().required(),
  fecha_salida: Joi.string().isoDate().required(),

  num_huespedes: Joi.number().integer().min(1).max(20).required(),

  habitaciones: Joi.array()
    .items(
      Joi.object({
        habitacion_id: Joi.number().integer().positive().required(),
      })
    )
    .min(1)
    .required(),

  servicios: Joi.array()
    .items(
      Joi.object({
        servicio_id: Joi.number().integer().positive().required(),
        cantidad: Joi.number().integer().min(1).max(9999).default(1),
      })
    )
    .default([]),

  pago: Joi.object({
    metodo: Joi.string().valid('tarjeta', 'efectivo', 'transferencia', 'paypal').required(),
    monto: Joi.number().positive().required(),
  }).allow(null),
})
.custom((value, helpers) => {
  const entrada = new Date(value.fecha_entrada);
  const salida = new Date(value.fecha_salida);

  if (salida <= entrada) {
    return helpers.message('fecha_salida debe ser mayor que fecha_entrada');
  }

  return value;
})
.unknown(false);

const actualizarReservaSchema = Joi.object({
  fecha_entrada: Joi.string().isoDate().optional(),
  fecha_salida: Joi.string().isoDate().optional(),
  num_huespedes: Joi.number().integer().min(1).max(20).optional(),
  estado: Joi.string().valid('pendiente', 'confirmada', 'cancelada', 'completada').optional(),
  metodo_pago: Joi.string().max(50).allow(null).optional(),
}).min(1).unknown(false);

module.exports = { crearReservaSchema, actualizarReservaSchema };