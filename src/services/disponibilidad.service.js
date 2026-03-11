const { Op } = require('sequelize');
const { models } = require('../models');

function seCruzaRango(aIni, aFin, bIni, bFin) {
  // Cruce si NO (aFin <= bIni OR aIni >= bFin)
  return !(aFin <= bIni || aIni >= bFin);
}

async function habitacionDisponible({ habitacion_id, fecha_entrada, fecha_salida }) {
  // 1) Bloqueos activos
  const bloqueos = await models.BloqueoHabitacion.findAll({
    where: { habitacion_id, estado: 'activo' },
  });

  for (const b of bloqueos) {
    if (seCruzaRango(fecha_entrada, fecha_salida, b.fecha_inicio, b.fecha_fin)) {
      return { disponible: false, motivo: 'bloqueo', detalle: b };
    }
  }

  // 2) Reservas activas (via detalle_reserva)
  const detalles = await models.DetalleReserva.findAll({
    where: { habitacion_id },
    include: [
      {
        model: models.Reserva,
        as: 'reserva',
        where: {
          estado: { [Op.in]: ['pendiente', 'confirmada', 'completada'] },
        },
        required: true,
      },
    ],
  });

  for (const d of detalles) {
    const r = d.reserva;
    if (seCruzaRango(fecha_entrada, fecha_salida, r.fecha_entrada, r.fecha_salida)) {
      return { disponible: false, motivo: 'reserva', detalle: r };
    }
  }

  return { disponible: true };
}

module.exports = { habitacionDisponible };
