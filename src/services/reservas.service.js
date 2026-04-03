const { sequelize } = require('../config/db');
const { models } = require('../models');
const { Op } = require('sequelize');

const { habitacionDisponible } = require('./disponibilidad.service');
const { obtenerPrecioNoche } = require('./precios.service');

function diasEntre(fechaInicio, fechaFin) {
  const a = new Date(fechaInicio);
  const b = new Date(fechaFin);
  const ms = b - a;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function generarCodigoReserva() {
  return `RES-${Date.now()}`;
}

/**
 * =========================================================
 * CREAR RESERVA (Transacción PRO)
 * =========================================================
 */
async function crearReserva(payload) {
  const {
    cliente_id,
    hotel_id,
    fecha_entrada,
    fecha_salida,
    num_huespedes,
    habitaciones = [],
    servicios = [],
    pago = null,
  } = payload;

  if (!cliente_id || !hotel_id || !fecha_entrada || !fecha_salida || !num_huespedes) {
    throw crearError('Faltan campos obligatorios', 400);
  }

  if (!Array.isArray(habitaciones) || habitaciones.length < 1) {
    throw crearError('Debes enviar al menos una habitación', 400);
  }

  const hoy = new Date();
  if (new Date(fecha_entrada) < hoy) {
    throw crearError('No puedes reservar fechas pasadas', 400);
  }

  const noches = diasEntre(fecha_entrada, fecha_salida);
  if (noches <= 0) {
    throw crearError('fecha_salida debe ser mayor a fecha_entrada', 400);
  }

  return sequelize.transaction(async (t) => {
    const [cliente, hotel] = await Promise.all([
      models.Cliente.findByPk(cliente_id, { transaction: t }),
      models.Hotel.findByPk(hotel_id, { transaction: t }),
    ]);

    if (!cliente) throw crearError('Cliente no existe', 404);
    if (!hotel) throw crearError('Hotel no existe', 404);

    let precioTotal = 0;
    const detallesCrear = [];

    for (const item of habitaciones) {
      const habitacion = await models.Habitacion.findByPk(item.habitacion_id, {
        transaction: t,
        lock: t.LOCK.UPDATE, // 🔥 evita doble reserva
      });

      if (!habitacion) {
        throw crearError(`Habitación no existe: ${item.habitacion_id}`, 404);
      }

      if (String(habitacion.hotel_id) !== String(hotel_id)) {
        throw crearError('Habitación no pertenece al hotel', 400);
      }

      const disp = await habitacionDisponible({
        habitacion_id: habitacion.id,
        fecha_entrada,
        fecha_salida,
      });

      if (!disp.disponible) {
        throw crearError(`No disponible: ${disp.motivo}`, 409, {
          habitacion_id: habitacion.id,
        });
      }

      const precioNoche = await obtenerPrecioNoche({
        tipo_habitacion_id: habitacion.tipo_habitacion_id,
        fecha: fecha_entrada,
      });

      const subtotal = Number((precioNoche * noches).toFixed(2));
      precioTotal += subtotal;

      detallesCrear.push({
        habitacion_id: habitacion.id,
        precio_noche: precioNoche,
        noches,
        subtotal,
      });
    }

    // Servicios
    const serviciosCrear = [];

    for (const s of servicios) {
      const servicio = await models.Servicio.findByPk(s.servicio_id, { transaction: t });

      if (!servicio || String(servicio.hotel_id) !== String(hotel_id)) {
        throw crearError('Servicio inválido', 400);
      }

      const cantidad = Number(s.cantidad || 1);
      const subtotal = cantidad * Number(servicio.precio);

      precioTotal += subtotal;

      serviciosCrear.push({
        servicio_id: servicio.id,
        cantidad,
        precio_unitario: servicio.precio,
        subtotal,
      });
    }

    // Crear reserva
    const reserva = await models.Reserva.create(
      {
        cliente_id,
        hotel_id,
        fecha_entrada,
        fecha_salida,
        num_huespedes,
        estado: 'pendiente',
        precio_total: Number(precioTotal.toFixed(2)),
        codigo_reserva: generarCodigoReserva(),
        metodo_pago: pago?.metodo || null,
      },
      { transaction: t }
    );

    // Detalles
    for (const d of detallesCrear) {
      await models.DetalleReserva.create(
        { reserva_id: reserva.id, ...d },
        { transaction: t }
      );
    }

    // Servicios
    for (const sr of serviciosCrear) {
      await models.ServicioReserva.create(
        { reserva_id: reserva.id, ...sr },
        { transaction: t }
      );
    }

    // Pago
    let pagoCreado = null;

    if (pago && pago.metodo && pago.monto) {
      if (Number(pago.monto) < precioTotal) {
        throw crearError('Monto insuficiente', 400);
      }

      pagoCreado = await models.Pago.create(
        {
          reserva_id: reserva.id,
          metodo: pago.metodo,
          monto: pago.monto,
          estado: 'aprobado', // 🔥 corregido
        },
        { transaction: t }
      );

      await reserva.update({ estado: 'confirmada' }, { transaction: t });
    }

    const reservaCompleta = await obtenerReservaPorId(reserva.id, { transaction: t });

    return { reserva: reservaCompleta, pago: pagoCreado };
  });
}

/**
 * =========================================================
 * LISTAR
 * =========================================================
 */
async function listarReservas(filtros = {}) {
  const where = {};
  if (filtros.hotel_id) where.hotel_id = filtros.hotel_id;
  if (filtros.cliente_id) where.cliente_id = filtros.cliente_id;
  if (filtros.estado) where.estado = filtros.estado;

  return models.Reserva.findAll({
    where,
    order: [['id', 'DESC']],
    include: [
      { model: models.Cliente },
      { model: models.Hotel },
      {
        model: models.DetalleReserva,
        include: [{ model: models.Habitacion }],
      },
      { model: models.Pago },
      {
        model: models.ServicioReserva,
        include: [{ model: models.Servicio }],
      },
      { model: models.Valoracion },
    ],
  });
}

/**
 * =========================================================
 * OBTENER POR ID
 * =========================================================
 */
async function obtenerReservaPorId(id, options = {}) {
  return models.Reserva.findByPk(id, {
    transaction: options.transaction,
    include: [
      { model: models.Cliente },
      { model: models.Hotel },
      {
        model: models.DetalleReserva,
        include: [{ model: models.Habitacion }],
      },
      { model: models.Pago },
      {
        model: models.ServicioReserva,
        include: [{ model: models.Servicio }],
      },
      { model: models.Valoracion },
    ],
  });
}

/**
 * =========================================================
 * ACTUALIZAR
 * =========================================================
 */
async function actualizarReserva(id, data) {
  const reserva = await models.Reserva.findByPk(id);
  if (!reserva) return null;

  const permitidos = [
    'fecha_entrada',
    'fecha_salida',
    'num_huespedes',
    'estado',
    'metodo_pago',
  ];

  const payload = {};
  for (const k of permitidos) {
    if (data[k] !== undefined) payload[k] = data[k];
  }

  if (payload.fecha_entrada || payload.fecha_salida) {
    const entrada = payload.fecha_entrada || reserva.fecha_entrada;
    const salida = payload.fecha_salida || reserva.fecha_salida;

    if (diasEntre(entrada, salida) <= 0) {
      throw crearError('Fechas inválidas', 400);
    }
  }

  await reserva.update(payload);

  return obtenerReservaPorId(id);
}

/**
 * =========================================================
 * CANCELAR
 * =========================================================
 */
async function cancelarReserva(id) {
  const reserva = await models.Reserva.findByPk(id);
  if (!reserva) return null;

  if (reserva.estado === 'cancelada') return reserva;

  return reserva.update({ estado: 'cancelada' });
}

/**
 * =========================================================
 * Helper error
 * =========================================================
 */
function crearError(mensaje, status = 500, details = null) {
  const err = new Error(mensaje);
  err.statusCode = status;
  if (details) err.details = details;
  return err;
}

module.exports = {
  crearReserva,
  listarReservas,
  obtenerReservaPorId,
  actualizarReserva,
  cancelarReserva,
};