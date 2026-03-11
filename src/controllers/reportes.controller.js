const { models, sequelize } = require('../models');
const { ok } = require('../utils/response');

const reservasPorMes = async (req, res, next) => {
  try {
    const [resultados] = await sequelize.query(`
      SELECT 
        MONTH(fecha_reserva) AS mes,
        COUNT(*) AS total
      FROM reservas
      GROUP BY MONTH(fecha_reserva)
      ORDER BY mes
    `);

    return ok(res, resultados, 'Reporte de reservas por mes');
  } catch (err) {
    next(err);
  }
};

const ingresosPorMes = async (req, res, next) => {
  try {
    const [resultados] = await sequelize.query(`
      SELECT 
        MONTH(fecha_pago) AS mes,
        SUM(monto) AS total
      FROM pagos
      WHERE estado = 'completado'
      GROUP BY MONTH(fecha_pago)
      ORDER BY mes
    `);

    return ok(res, resultados, 'Reporte de ingresos por mes');
  } catch (err) {
    next(err);
  }
};

const ocupacionHabitaciones = async (req, res, next) => {
  try {
    const [resultados] = await sequelize.query(`
      SELECT estado, COUNT(*) AS total
      FROM habitaciones
      GROUP BY estado
    `);

    return ok(res, resultados, 'Ocupación de habitaciones');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  reservasPorMes,
  ingresosPorMes,
  ocupacionHabitaciones
};
