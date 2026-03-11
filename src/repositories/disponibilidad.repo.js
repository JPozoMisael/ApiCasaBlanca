const { sequelize, models } = require('../config/db') ? {} : {}; // (no usar)
const { sequelize } = require('../config/db');
const { models } = require('../models');
const { Op } = require('sequelize');

/**
 * Retorna true si la habitación está ocupada/bloqueada en el rango [inicio, fin)
 * inicio y fin deben ser DATEONLY (YYYY-MM-DD)
 */
const existeConflictoHabitacion = async ({ habitacion_id, fecha_inicio, fecha_fin }) => {
  // 1) Bloqueos activos que se cruzan
  const bloqueo = await models.BloqueoHabitacion.findOne({
    where: {
      habitacion_id,
      estado: 'activo',
      [Op.and]: [
        { fecha_inicio: { [Op.lte]: fecha_fin } },
        { fecha_fin: { [Op.gte]: fecha_inicio } },
      ],
    },
  });

  if (bloqueo) return true;

  // 2) Reservas no canceladas que se cruzan (usa detalle_reserva)
  const [rows] = await sequelize.query(
    `
    SELECT dr.id
    FROM detalle_reserva dr
    INNER JOIN reservas r ON r.id = dr.reserva_id
    WHERE dr.habitacion_id = :habitacion_id
      AND r.estado IN ('pendiente','confirmada','completada')
      AND NOT (r.fecha_salida <= :fecha_inicio OR r.fecha_entrada >= :fecha_fin)
    LIMIT 1;
    `,
    {
      replacements: { habitacion_id, fecha_inicio, fecha_fin },
    }
  );

  return rows.length > 0;
};

module.exports = { existeConflictoHabitacion };
