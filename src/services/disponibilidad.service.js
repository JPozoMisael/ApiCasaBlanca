const { Op } = require('sequelize');
const { models } = require('../models');
const { ESTADOS_RESERVA_ACTIVOS } = require('../config/constants');
const canales = require('./canales.service');

/*
| Única fuente de verdad de la disponibilidad. Una habitación está libre para [entrada, salida) si:
|   - no está fuera de inventario (estado inactiva/mantenimiento),
|   - no tiene una reserva activa que se cruce (las 'pendiente' con retención vencida NO cuentan),
|   - no tiene un bloqueo activo que se cruce.
| Convención de rangos: la noche de salida no se ocupa (salida == entrada de otro es válido).
*/

const FUERA_DE_INVENTARIO = ['inactiva', 'mantenimiento'];

/**
 * @returns {Promise<Array<{id, hotel_id, tipo_habitacion_id, numero_habitacion, piso}>>}
 */
async function habitacionesLibres({ hotelIds, entrada, salida, ahora = new Date(), excluirReservaId = null, transaction }) {
  const ids = [].concat(hotelIds);

  const habitaciones = await models.Habitacion.findAll({
    where: { hotel_id: { [Op.in]: ids }, estado: { [Op.notIn]: FUERA_DE_INVENTARIO } },
    attributes: ['id', 'hotel_id', 'tipo_habitacion_id', 'numero_habitacion', 'piso'],
    order: [['numero_habitacion', 'ASC']],
    raw: true,
    transaction,
  });
  if (!habitaciones.length) return [];

  const [detallesOcupados, bloqueos] = await Promise.all([
    models.DetalleReserva.findAll({
      attributes: ['habitacion_id'],
      include: [
        {
          model: models.Reserva,
          as: 'reserva',
          attributes: [],
          required: true,
          where: {
            hotel_id: { [Op.in]: ids },
            ...(excluirReservaId ? { id: { [Op.ne]: excluirReservaId } } : {}),
            estado: { [Op.in]: ESTADOS_RESERVA_ACTIVOS },
            fecha_entrada: { [Op.lt]: salida },
            fecha_salida: { [Op.gt]: entrada },
            [Op.or]: [
              { estado: { [Op.ne]: 'pendiente' } },
              { expira_en: null },
              { expira_en: { [Op.gt]: ahora } },
            ],
          },
        },
      ],
      raw: true,
      transaction,
    }),
    models.BloqueoHabitacion.findAll({
      where: {
        habitacion_id: { [Op.in]: habitaciones.map((h) => h.id) },
        estado: 'activo',
        fecha_inicio: { [Op.lt]: salida },
        fecha_fin: { [Op.gte]: entrada },
      },
      attributes: ['habitacion_id'],
      raw: true,
      transaction,
    }),
  ]);

  const ocupadas = new Set([
    ...detallesOcupados.map((d) => d.habitacion_id),
    ...bloqueos.map((b) => b.habitacion_id),
  ]);

  const libres = habitaciones.filter((h) => !ocupadas.has(h.id));

  // Hoteles conectados a un channel manager: sus tipos mapeados se limitan a lo que él informa.
  // Al reconfirmar una reserva propia (excluirReservaId) no se vuelve a descontar su venta.
  if (excluirReservaId) return libres;
  return canales.aplicarCanal({ libres, hotelIds: ids, entrada, salida, transaction });
}

async function habitacionDisponible({ habitacion_id, hotel_id, entrada, salida, transaction }) {
  const libres = await habitacionesLibres({ hotelIds: hotel_id, entrada, salida, transaction });
  return libres.some((h) => h.id === Number(habitacion_id));
}

module.exports = { habitacionesLibres, habitacionDisponible, FUERA_DE_INVENTARIO };
