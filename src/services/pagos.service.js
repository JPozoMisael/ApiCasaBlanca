const pagosRepo = require('../repositories/pagos.repo');
const { sequelize } = require('../config/db');
const { models } = require('../models');

/**
 * LISTAR
 */
async function listarPagos(filtros = {}) {
  return pagosRepo.listar(filtros);
}

/**
 * REGISTRAR PAGO
 */
async function registrarPago(data) {
  if (!data?.reserva_id || data?.monto == null || !data?.metodo) {
    throw crearError('reserva_id, monto y metodo son obligatorios', 400);
  }

  const monto = Number(data.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw crearError('monto inválido', 400);
  }

  const reserva = await models.Reserva.findByPk(data.reserva_id);

  if (!reserva) {
    throw crearError('Reserva no existe', 404);
  }

  if (!data.estado) data.estado = 'pendiente';

  const pago = await pagosRepo.crear({
    reserva_id: data.reserva_id,
    monto,
    metodo: data.metodo,
    estado: data.estado,
  });

  return pago;
}

/**
 * REGISTRAR PAGO + CONFIRMAR
 */
async function registrarPagoYConfirmarReserva({ reserva_id, monto, metodo }) {
  if (!reserva_id || monto == null || !metodo) {
    throw crearError('reserva_id, monto y metodo son obligatorios', 400);
  }

  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    throw crearError('monto inválido', 400);
  }

  return sequelize.transaction(async (t) => {

    const reserva = await models.Reserva.findByPk(reserva_id, {
      transaction: t,
      lock: t.LOCK.UPDATE, // 🔥 evita doble pago
    });

    if (!reserva) {
      throw crearError('Reserva no existe', 404);
    }

    if (montoNum < Number(reserva.precio_total)) {
      throw crearError('Monto insuficiente', 400);
    }

    const pago = await models.Pago.create(
      {
        reserva_id,
        monto: montoNum,
        metodo,
        estado: 'aprobado', // 🔥 corregido
      },
      { transaction: t }
    );

    if (reserva.estado === 'pendiente') {
      await reserva.update(
        {
          estado: 'confirmada',
          metodo_pago: metodo,
        },
        { transaction: t }
      );
    }

    return { pago, reserva };
  });
}

/**
 * Helper error
 */
function crearError(msg, status = 500) {
  const err = new Error(msg);
  err.statusCode = status;
  return err;
}

module.exports = {
  listarPagos,
  registrarPago,
  registrarPagoYConfirmarReserva,
};