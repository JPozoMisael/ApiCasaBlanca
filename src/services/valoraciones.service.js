const { sequelize } = require('../config/db');
const { models } = require('../models');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { recalcularRating } = require('./hoteles.service');

async function listarPorHotel(hotelId, { page = 1, limit = 10 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

  const { rows, count } = await models.Valoracion.findAndCountAll({
    where: { hotel_id: hotelId, estado: 'publicada' },
    include: [{ model: models.User, as: 'usuario', attributes: ['nombre'] }],
    order: [['fecha', 'DESC']],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  return {
    data: rows.map((v) => ({
      id: v.id,
      puntuacion: v.puntuacion,
      titulo: v.titulo,
      comentario: v.comentario,
      respuesta_hotel: v.respuesta_hotel,
      fecha: v.fecha,
      autor: v.usuario?.nombre || 'Huésped',
      verificada: v.reserva_id !== null,
    })),
    meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
  };
}

// Solo puede opinar quien completó una estadía (reserva en check_out) y una vez por reserva.
async function crear({ reserva_id, puntuacion, titulo, comentario }, actor) {
  const reserva = await models.Reserva.findByPk(reserva_id);
  if (!reserva || reserva.user_id !== actor.id) {
    throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
  }
  if (reserva.estado !== 'check_out') {
    throw new AppError('Solo puedes valorar después de completar tu estadía', 409, 'ESTADIA_NO_COMPLETADA');
  }
  const previa = await models.Valoracion.findOne({ where: { reserva_id }, attributes: ['id'] });
  if (previa) throw new AppError('Ya valoraste esta reserva', 409, 'VALORACION_DUPLICADA');

  return sequelize.transaction(async (t) => {
    const valoracion = await models.Valoracion.create(
      { reserva_id, hotel_id: reserva.hotel_id, user_id: actor.id, puntuacion, titulo, comentario },
      { transaction: t }
    );
    await recalcularRating(reserva.hotel_id, t);
    return valoracion;
  });
}

async function responder(id, texto, actor) {
  const valoracion = await models.Valoracion.findByPk(id);
  if (!valoracion) throw new AppError('Valoración no encontrada', 404);
  if (actor.alcance !== 'plataforma' && Number(actor.hotel_id) !== valoracion.hotel_id) {
    throw new AppError('Valoración no encontrada', 404);
  }
  await valoracion.update({ respuesta_hotel: texto });
  return valoracion;
}

async function moderar(id, estado, actor) {
  if (actor.alcance !== 'plataforma') throw new AppError('Solo la plataforma puede moderar', 403);
  const valoracion = await models.Valoracion.findByPk(id);
  if (!valoracion) throw new AppError('Valoración no encontrada', 404);
  await sequelize.transaction(async (t) => {
    await valoracion.update({ estado }, { transaction: t });
    await recalcularRating(valoracion.hotel_id, t);
  });
  return valoracion;
}

module.exports = { listarPorHotel, crear, responder, moderar };
