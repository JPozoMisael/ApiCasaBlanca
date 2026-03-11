const { sequelize } = require('../config/db');
const { models } = require('../models');
const { Op } = require('sequelize');

const { habitacionDisponible } = require('./disponibilidad.service');
const { obtenerPrecioNoche } = require('./precios.service');

function diasEntre(fechaInicio, fechaFin) {
  const a = new Date(fechaInicio);
  const b = new Date(fechaFin);
  const ms = b - a;
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return dias;
}

/**
 * =========================================================
 * CREAR RESERVA (Transacción)
 * payload recomendado:
 * {
 *   cliente_id,
 *   hotel_id,
 *   fecha_entrada: "2026-01-10",
 *   fecha_salida: "2026-01-12",
 *   num_huespedes,
 *   habitaciones: [{ habitacion_id }],
 *   servicios: [{ servicio_id, cantidad }], // opcional
 *   pago: { metodo, monto } // opcional
 * }
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
    const err = new Error('Faltan campos obligatorios para la reserva');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(habitaciones) || habitaciones.length < 1) {
    const err = new Error('Debes enviar al menos una habitación para la reserva');
    err.statusCode = 400;
    throw err;
  }

  const noches = diasEntre(fecha_entrada, fecha_salida);
  if (noches <= 0) {
    const err = new Error('fecha_salida debe ser mayor a fecha_entrada');
    err.statusCode = 400;
    throw err;
  }

  return sequelize.transaction(async (t) => {
    // Validar existencia
    const [cliente, hotel] = await Promise.all([
      models.Cliente.findByPk(cliente_id, { transaction: t }),
      models.Hotel.findByPk(hotel_id, { transaction: t }),
    ]);

    if (!cliente) {
      const err = new Error('Cliente no existe');
      err.statusCode = 404;
      throw err;
    }
    if (!hotel) {
      const err = new Error('Hotel no existe');
      err.statusCode = 404;
      throw err;
    }

    // Validar disponibilidad y calcular total
    let precioTotal = 0;
    const detallesCrear = [];

    for (const item of habitaciones) {
      const habitacion = await models.Habitacion.findByPk(item.habitacion_id, { transaction: t });

      if (!habitacion) {
        const err = new Error(`Habitación no existe: ${item.habitacion_id}`);
        err.statusCode = 404;
        throw err;
      }

      if (String(habitacion.hotel_id) !== String(hotel_id)) {
        const err = new Error(`La habitación ${item.habitacion_id} no pertenece al hotel`);
        err.statusCode = 400;
        throw err;
      }

      // disponibilidad
      const disp = await habitacionDisponible({
        habitacion_id: habitacion.id,
        fecha_entrada,
        fecha_salida,
      });

      if (!disp.disponible) {
        const err = new Error(`Habitación no disponible (${disp.motivo})`);
        err.statusCode = 409;
        err.details = { habitacion_id: habitacion.id, ...disp };
        throw err;
      }

      // precio por noche (por tipo de habitación)
      const tipoId = habitacion.tipo_habitacion_id;
      const precioNoche = await obtenerPrecioNoche({
        tipo_habitacion_id: tipoId,
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

    // Servicios opcionales (sumar al total)
    const serviciosCrear = [];
    if (Array.isArray(servicios) && servicios.length > 0) {
      for (const s of servicios) {
        const servicio = await models.Servicio.findByPk(s.servicio_id, { transaction: t });
        if (!servicio || String(servicio.hotel_id) !== String(hotel_id)) {
          const err = new Error('Servicio no válido para este hotel');
          err.statusCode = 400;
          throw err;
        }

        const cantidad = Number(s.cantidad || 1);
        const precioUnit = Number(servicio.precio);
        const subtotal = Number((cantidad * precioUnit).toFixed(2));

        precioTotal += subtotal;

        serviciosCrear.push({
          servicio_id: servicio.id,
          cantidad,
          precio_unitario: precioUnit,
          subtotal,
        });
      }
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
        metodo_pago: pago?.metodo || null,
      },
      { transaction: t }
    );

    // Crear detalle_reserva
    for (const d of detallesCrear) {
      await models.DetalleReserva.create(
        { reserva_id: reserva.id, ...d },
        { transaction: t }
      );
    }

    // Crear servicios_reserva
    for (const sr of serviciosCrear) {
      await models.ServicioReserva.create(
        { reserva_id: reserva.id, ...sr },
        { transaction: t }
      );
    }

    // Pago opcional
    let pagoCreado = null;
    if (pago && pago.metodo && pago.monto) {
      pagoCreado = await models.Pago.create(
        {
          reserva_id: reserva.id,
          metodo: pago.metodo,
          monto: pago.monto,
          estado: 'completado',
        },
        { transaction: t }
      );

      // confirmar reserva si se pagó
      await reserva.update({ estado: 'confirmada' }, { transaction: t });
    }

    // Retornar la reserva completa (con includes)
    const reservaCompleta = await obtenerReservaPorId(reserva.id, { transaction: t });

    return { reserva: reservaCompleta, pago: pagoCreado };
  });
}

/**
 * =========================================================
 * LISTAR RESERVAS (con includes)
 * filtros:
 *  - hotel_id
 *  - cliente_id
 *  - estado
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
 * OBTENER RESERVA POR ID (con includes)
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
 * ACTUALIZAR RESERVA (solo campos básicos)
 * NO modifica detalle_reserva ni servicios_reserva
 * =========================================================
 */
async function actualizarReserva(id, data) {
  const reserva = await models.Reserva.findByPk(id);
  if (!reserva) return null;

  // Permitimos solo campos seguros
  const permitidos = [
    'fecha_entrada',
    'fecha_salida',
    'num_huespedes',
    'estado',
    'metodo_pago',
  ];

  const payload = {};
  for (const k of permitidos) {
    if (typeof data[k] !== 'undefined') payload[k] = data[k];
  }

  // Validación básica si cambian fechas
  if (payload.fecha_entrada || payload.fecha_salida) {
    const entrada = payload.fecha_entrada || reserva.fecha_entrada;
    const salida = payload.fecha_salida || reserva.fecha_salida;
    if (diasEntre(entrada, salida) <= 0) {
      const err = new Error('fecha_salida debe ser mayor a fecha_entrada');
      err.statusCode = 400;
      throw err;
    }

    // Si quieres, aquí luego agregamos: revalidar disponibilidad de habitaciones actuales.
  }

  await reserva.update(payload);

  return obtenerReservaPorId(id);
}

/**
 * =========================================================
 * CANCELAR RESERVA
 * =========================================================
 */
async function cancelarReserva(id) {
  const reserva = await models.Reserva.findByPk(id);
  if (!reserva) return null;

  // Si ya está cancelada, no rompas
  if (reserva.estado === 'cancelada') return reserva;

  return reserva.update({ estado: 'cancelada' });
}

module.exports = {
  crearReserva,
  listarReservas,
  obtenerReservaPorId,
  actualizarReserva,
  cancelarReserva,
};