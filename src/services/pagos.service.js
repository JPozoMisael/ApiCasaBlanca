const pagosRepo = require('../repositories/pagos.repo');

const { sequelize } = require('../config/db');

const { models } = require('../models');

/*
|--------------------------------------------------------------------------
| LISTAR PAGOS
|--------------------------------------------------------------------------
*/

async function listarPagos(filtros = {}) {

  return pagosRepo.listar(filtros);
}

/*
|--------------------------------------------------------------------------
| OBTENER PAGO POR ID
|--------------------------------------------------------------------------
*/

async function obtenerPagoPorId(id) {

  return pagosRepo.obtenerPorId(id);
}

/*
|--------------------------------------------------------------------------
| ACTUALIZAR PAGO
|--------------------------------------------------------------------------
*/

async function actualizarPago(id, data = {}) {

  const pago = await pagosRepo.obtenerPorId(id);

  if (!pago) {
    return null;
  }

  await pago.update(data);

  return pago;
}

/*
|--------------------------------------------------------------------------
| ELIMINAR PAGO
|--------------------------------------------------------------------------
*/

async function eliminarPago(id) {

  const pago = await pagosRepo.obtenerPorId(id);

  if (!pago) {
    return false;
  }

  await pago.destroy();

  return true;
}

/*
|--------------------------------------------------------------------------
| REGISTRAR PAGO
|--------------------------------------------------------------------------
*/

async function registrarPago(data) {

  if (
    !data?.reserva_id ||
    data?.monto == null ||
    !data?.metodo
  ) {
    throw crearError(
      'reserva_id, monto y metodo son obligatorios',
      400
    );
  }

  const monto = Number(data.monto);

  if (!Number.isFinite(monto) || monto <= 0) {
    throw crearError('monto inválido', 400);
  }

  const reserva = await models.Reserva.findByPk(
    data.reserva_id
  );

  if (!reserva) {
    throw crearError('Reserva no existe', 404);
  }

  const pago = await pagosRepo.crear({
    reserva_id: data.reserva_id,
    monto,
    metodo: data.metodo,
    estado: data.estado || 'pendiente',
    referencia: data.referencia || null,
    observaciones: data.observaciones || null,
  });

  return pago;
}

/*
|--------------------------------------------------------------------------
| REGISTRAR PAGO + CONFIRMAR RESERVA
|--------------------------------------------------------------------------
*/

async function registrarPagoYConfirmarReserva({
  reserva_id,
  monto,
  metodo,
}) {

  if (!reserva_id || monto == null || !metodo) {

    throw crearError(
      'reserva_id, monto y metodo son obligatorios',
      400
    );
  }

  const montoNum = Number(monto);

  if (
    !Number.isFinite(montoNum) ||
    montoNum <= 0
  ) {
    throw crearError('monto inválido', 400);
  }

  return sequelize.transaction(async (t) => {

    const reserva = await models.Reserva.findByPk(
      reserva_id,
      {
        transaction: t,
        lock: t.LOCK.UPDATE,
      }
    );

    if (!reserva) {
      throw crearError('Reserva no existe', 404);
    }

    if (
      montoNum < Number(reserva.precio_total)
    ) {
      throw crearError(
        'Monto insuficiente',
        400
      );
    }

    const pago = await models.Pago.create(
      {
        reserva_id,
        monto: montoNum,
        metodo,
        estado: 'aprobado',
      },
      {
        transaction: t,
      }
    );

    if (
      reserva.estado === 'pendiente'
    ) {

      await reserva.update(
        {
          estado: 'confirmada',
          metodo_pago: metodo,
        },
        {
          transaction: t,
        }
      );
    }

    return {
      pago,
      reserva,
    };
  });
}

/*
|--------------------------------------------------------------------------
| INICIAR PAGO
|--------------------------------------------------------------------------
*/

async function iniciarPago({
  reserva_id,
  metodo,
  usuario_id,
}) {

  const reserva =
    await models.Reserva.findByPk(
      reserva_id
    );

  if (!reserva) {
    throw crearError(
      'Reserva no encontrada',
      404
    );
  }

  return {
    reserva_id,
    metodo,
    monto: reserva.precio_total,
    estado: 'pendiente',
    usuario_id,
  };
}

/*
|--------------------------------------------------------------------------
| CONFIRMAR PAGO
|--------------------------------------------------------------------------
*/

async function confirmarPago({
  pago_id,
  transaction_id,
  gateway,
}) {

  const pago = await models.Pago.findByPk(
    pago_id
  );

  if (!pago) {
    throw crearError(
      'Pago no encontrado',
      404
    );
  }

  await pago.update({
    estado: 'aprobado',
    referencia: transaction_id,
    observaciones: `Confirmado por ${gateway}`,
  });

  return pago;
}

/*
|--------------------------------------------------------------------------
| VERIFICAR ESTADO
|--------------------------------------------------------------------------
*/

async function verificarEstado(
  pago_id
) {

  const pago = await models.Pago.findByPk(
    pago_id
  );

  if (!pago) {
    throw crearError(
      'Pago no encontrado',
      404
    );
  }

  return {
    id: pago.id,
    estado: pago.estado,
  };
}

/*
|--------------------------------------------------------------------------
| WEBHOOK STRIPE
|--------------------------------------------------------------------------
*/

async function procesarWebhookStripe({
  payload,
  signature,
}) {

  return {
    ok: true,
    provider: 'stripe',
  };
}

/*
|--------------------------------------------------------------------------
| WEBHOOK PAYPAL
|--------------------------------------------------------------------------
*/

async function procesarWebhookPaypal(
  payload
) {

  return {
    ok: true,
    provider: 'paypal',
  };
}

/*
|--------------------------------------------------------------------------
| REEMBOLSAR
|--------------------------------------------------------------------------
*/

async function reembolsar({
  pago_id,
  monto,
  motivo,
  usuario_id,
}) {

  const pago = await models.Pago.findByPk(
    pago_id
  );

  if (!pago) {
    throw crearError(
      'Pago no encontrado',
      404
    );
  }

  await pago.update({
    estado: 'anulado',
    observaciones: motivo || null,
  });

  return pago;
}

/*
|--------------------------------------------------------------------------
| MÉTODOS DISPONIBLES
|--------------------------------------------------------------------------
*/

async function getMetodosDisponibles() {

  return [
    {
      codigo: 'stripe',
      nombre: 'Stripe',
      activo: true,
    },

    {
      codigo: 'paypal',
      nombre: 'PayPal',
      activo: true,
    },

    {
      codigo: 'efectivo',
      nombre: 'Efectivo',
      activo: true,
    },

    {
      codigo: 'transferencia',
      nombre: 'Transferencia bancaria',
      activo: true,
    },
  ];
}

/*
|--------------------------------------------------------------------------
| HISTORIAL CLIENTE
|--------------------------------------------------------------------------
*/

async function getHistorialCliente({
  cliente_id,
  page = 1,
  limit = 10,
}) {

  return {
    cliente_id,
    page,
    limit,
    data: [],
  };
}

/*
|--------------------------------------------------------------------------
| FACTURA PDF
|--------------------------------------------------------------------------
*/

async function generarFactura(
  pago_id
) {

  return Buffer.from(
    `Factura ${pago_id}`
  );
}

/*
|--------------------------------------------------------------------------
| HELPER ERROR
|--------------------------------------------------------------------------
*/

function crearError(
  msg,
  status = 500
) {

  const err = new Error(msg);

  err.statusCode = status;

  return err;
}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  listarPagos,
  obtenerPagoPorId,
  actualizarPago,
  eliminarPago,

  registrarPago,
  registrarPagoYConfirmarReserva,

  iniciarPago,
  confirmarPago,
  verificarEstado,

  procesarWebhookStripe,
  procesarWebhookPaypal,

  reembolsar,

  getMetodosDisponibles,

  getHistorialCliente,

  generarFactura,
};