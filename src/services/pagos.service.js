const pagosRepo = require('../repositories/pagos.repo');
const { sequelize } = require('../config/db');
const { models } = require('../models');

async function listarPagos(filtros = {}) {
  return pagosRepo.listar(filtros);
}

async function registrarPago(data) {
  // Validación mínima
  if (!data?.reserva_id || data?.monto == null || !data?.metodo) {
    const err = new Error('reserva_id, monto y metodo son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const monto = Number(data.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    const err = new Error('monto debe ser un número mayor a 0');
    err.statusCode = 400;
    throw err;
  }

  // Validar que la reserva exista
  const reserva = await models.Reserva.findByPk(data.reserva_id);
  if (!reserva) {
    const err = new Error('Reserva no existe');
    err.statusCode = 404;
    throw err;
  }

  // Si no mandan estado, por defecto pendiente
  if (!data.estado) data.estado = 'pendiente';

  const pago = await pagosRepo.crear({
    reserva_id: data.reserva_id,
    monto,
    metodo: data.metodo,
    estado: data.estado,
  });

  // Si llega como completado, confirmar reserva (opcional pero recomendado)
  if (pago.estado === 'completado' && reserva.estado === 'pendiente') {
    await reserva.update({ estado: 'confirmada', metodo_pago: pago.metodo });
  }

  return pago;
}

async function registrarPagoYConfirmarReserva({ reserva_id, monto, metodo }) {
  if (!reserva_id || monto == null || !metodo) {
    const err = new Error('reserva_id, monto y metodo son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    const err = new Error('monto debe ser un número mayor a 0');
    err.statusCode = 400;
    throw err;
  }

  return sequelize.transaction(async (t) => {
    const reserva = await models.Reserva.findByPk(reserva_id, { transaction: t });
    if (!reserva) {
      const err = new Error('Reserva no existe');
      err.statusCode = 404;
      throw err;
    }

    const pago = await models.Pago.create(
      {
        reserva_id,
        monto: montoNum,
        metodo,
        estado: 'completado',
      },
      { transaction: t }
    );

    if (reserva.estado === 'pendiente') {
      await reserva.update(
        { estado: 'confirmada', metodo_pago: metodo },
        { transaction: t }
      );
    }

    return { pago, reserva };
  });
}

module.exports = {
  listarPagos,
  registrarPago,
  registrarPagoYConfirmarReserva,
};
