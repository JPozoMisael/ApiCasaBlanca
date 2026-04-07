// src/services/reportes.service.js
const { models } = require('../models');

async function getDashboard() {
  const [totalHoteles, totalReservas, totalPagos] = await Promise.all([
    models.Hotel.count(),
    models.Reserva.count(),
    models.Pago.count(),
  ]);

  return { totalHoteles, totalReservas, totalPagos };
}

module.exports = { getDashboard };