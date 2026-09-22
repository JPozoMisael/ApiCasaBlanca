const { sequelize } = require('../config/db');
const { models } = require('../models');
const { AppError } = require('../utils/errors');
const { redondear } = require('../utils/money');
const { asegurarInventario } = require('./reservas.service');

const INCLUDE_RESERVA = (hotelId) => [
  {
    model: models.Reserva,
    as: 'reserva',
    attributes: ['id', 'codigo_reserva', 'hotel_id', 'estado', 'precio_total', 'cliente_id'],
    where: hotelId ? { hotel_id: hotelId } : undefined,
    required: true,
    include: [{ model: models.Cliente, as: 'cliente', attributes: ['id', 'nombres', 'apellidos'] }],
  },
];

async function listar({ hotelId, reserva_id, estado, metodo, page = 1, limit = 30 }) {
  const where = {};
  if (reserva_id) where.reserva_id = reserva_id;
  if (estado) where.estado = estado;
  if (metodo) where.metodo = metodo;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 30));
  const { rows, count } = await models.Pago.findAndCountAll({
    where,
    include: INCLUDE_RESERVA(hotelId),
    order: [['id', 'DESC']],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });
  return { data: rows, meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) } };
}

// Registro manual de un pago (recepción cobra en mostrador, transferencia verificada, etc.).
async function registrar({ reserva_id, monto, metodo, referencia, observaciones }, hotelId) {
  return sequelize.transaction(async (t) => {
    const reserva = await models.Reserva.findByPk(reserva_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!reserva || (hotelId && reserva.hotel_id !== hotelId)) {
      throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
    }
    if (['cancelada', 'no_show'].includes(reserva.estado)) {
      throw new AppError('No se pueden registrar pagos en una reserva cancelada', 409);
    }

    const pagosPrevios = await models.Pago.findAll({
      where: { reserva_id, estado: 'aprobado' },
      attributes: ['monto'],
      raw: true,
      transaction: t,
    });
    const pagado = pagosPrevios.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = redondear(Number(reserva.precio_total) - pagado);
    if (monto > saldo + 0.001) {
      throw new AppError(`El monto excede el saldo pendiente (${saldo.toFixed(2)})`, 400, 'MONTO_EXCEDE_SALDO');
    }

    // Una reserva pendiente que recibe dinero debe seguir teniendo sus habitaciones.
    if (reserva.estado === 'pendiente') {
      await models.Hotel.findByPk(reserva.hotel_id, { transaction: t, lock: t.LOCK.UPDATE });
      await asegurarInventario(reserva, t);
    }

    const pago = await models.Pago.create(
      {
        reserva_id,
        monto,
        metodo,
        referencia: referencia || null,
        observaciones: observaciones || null,
        estado: 'aprobado',
        fecha_pago: new Date(),
      },
      { transaction: t }
    );

    // Cualquier abono detiene la expiración; con el pago completo la reserva se confirma.
    if (reserva.estado === 'pendiente') {
      const completo = redondear(pagado + monto) >= Number(reserva.precio_total);
      await reserva.update({ expira_en: null, ...(completo ? { estado: 'confirmada' } : {}) }, { transaction: t });
    }

    return { pago, saldo: redondear(saldo - monto), reserva_estado: reserva.estado };
  });
}

module.exports = { listar, registrar };
