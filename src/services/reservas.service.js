const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { models } = require('../models');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { validarRango, hoyISO } = require('../utils/dates');
const { redondear } = require('../utils/money');
const { generarCodigoReserva } = require('../utils/codes');
const { habitacionesLibres } = require('./disponibilidad.service');
const { cargarContexto, cotizarEstadia } = require('./precios.service');
const { evaluarCancelacion, describirPolitica } = require('./politicas.service');
const canales = require('./canales.service');
const salidaCanal = require('../integrations/siteminder/salida.service');

const esStaff = (actor) => Boolean(actor) && actor.alcance !== 'cliente';
const esSuperAdmin = (actor) => Boolean(actor) && actor.alcance === 'plataforma';

// Transiciones válidas del ciclo de vida de una reserva.
const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['check_in', 'cancelada', 'no_show'],
  check_in: ['check_out'],
  check_out: [],
  cancelada: [],
  no_show: [],
};

const INCLUDE_COMPLETO = () => [
  { model: models.Cliente, as: 'cliente' },
  {
    model: models.Hotel,
    as: 'hotel',
    attributes: [
      'id', 'nombre', 'slug', 'direccion', 'telefono', 'whatsapp', 'email',
      'imagen_principal', 'hora_checkin', 'hora_checkout', 'politica_cancelacion',
    ],
  },
  {
    model: models.DetalleReserva,
    as: 'detalles',
    include: [
      {
        model: models.Habitacion,
        as: 'habitacion',
        attributes: ['id', 'numero_habitacion', 'piso', 'tipo_habitacion_id'],
        include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre', 'capacidad_maxima'] }],
      },
    ],
  },
  { model: models.Pago, as: 'pagos' },
  { model: models.ServicioReserva, as: 'servicios', include: [{ model: models.Servicio, as: 'servicio', attributes: ['id', 'nombre'] }] },
];

/* ======================================================
   PRESUPUESTO (usado por cotizar y por crear)
====================================================== */
async function armarPresupuesto({ hotelId, entrada, salida, adultos, ninos = 0, items, servicios = [], transaction, permitirHotelInactivo = false }) {
  const noches = validarRango(entrada, salida, {
    maxNoches: C.MAX_NOCHES,
    maxAnticipacion: C.MAX_DIAS_ANTICIPACION,
  });

  const hotel = await models.Hotel.findByPk(hotelId, { transaction });
  if (!hotel) throw new AppError('Hotel no encontrado', 404, 'HOTEL_NO_ENCONTRADO');
  if (hotel.estado !== 'activo' && !permitirHotelInactivo) {
    throw new AppError('Este alojamiento no está recibiendo reservas', 409, 'HOTEL_NO_DISPONIBLE');
  }

  const totalHabitaciones = items.reduce((s, i) => s + (i.habitacion_id ? 1 : i.cantidad), 0);
  if (totalHabitaciones < 1) throw new AppError('Selecciona al menos una habitación', 400);
  if (totalHabitaciones > C.MAX_HABITACIONES_POR_RESERVA) {
    throw new AppError(`Máximo ${C.MAX_HABITACIONES_POR_RESERVA} habitaciones por reserva`, 400);
  }

  const libres = await habitacionesLibres({ hotelIds: hotel.id, entrada, salida, transaction });
  const tiposIds = [...new Set(libres.map((h) => h.tipo_habitacion_id).concat(items.map((i) => i.tipo_habitacion_id).filter(Boolean)))];
  const tipos = await models.TipoHabitacion.findAll({
    where: { id: { [Op.in]: tiposIds }, hotel_id: hotel.id, estado: 'activo' },
    raw: true,
    transaction,
  });
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
  const libresPorId = new Map(libres.map((h) => [h.id, h]));
  const usadas = new Set();

  // ---- asignación de habitaciones ----
  const asignadas = [];
  for (const item of items) {
    if (item.habitacion_id) {
      const hab = libresPorId.get(Number(item.habitacion_id));
      if (!hab || usadas.has(hab.id)) {
        throw new AppError('La habitación seleccionada no está disponible en esas fechas', 409, 'SIN_DISPONIBILIDAD', {
          habitacion_id: item.habitacion_id,
        });
      }
      usadas.add(hab.id);
      asignadas.push(hab);
      continue;
    }

    const tipo = tipoPorId.get(Number(item.tipo_habitacion_id));
    if (!tipo) throw new AppError('Tipo de habitación inválido para este hotel', 400, 'TIPO_INVALIDO');

    const candidatas = libres.filter((h) => h.tipo_habitacion_id === tipo.id && !usadas.has(h.id));
    if (candidatas.length < item.cantidad) {
      throw new AppError(
        `Solo quedan ${candidatas.length} habitación(es) de tipo "${tipo.nombre}" para esas fechas`,
        409,
        'SIN_DISPONIBILIDAD',
        { tipo_habitacion_id: tipo.id, disponibles: candidatas.length }
      );
    }
    for (const hab of candidatas.slice(0, item.cantidad)) {
      usadas.add(hab.id);
      asignadas.push(hab);
    }
  }

  // ---- capacidad ----
  const huespedes = Number(adultos) + Number(ninos);
  const capacidad = asignadas.reduce((s, h) => s + (tipoPorId.get(h.tipo_habitacion_id)?.capacidad_maxima || 0), 0);
  if (huespedes > capacidad) {
    throw new AppError(
      `La capacidad de las habitaciones elegidas (${capacidad}) es menor al número de huéspedes (${huespedes})`,
      400,
      'CAPACIDAD_INSUFICIENTE'
    );
  }

  // ---- precios ----
  const ctx = await cargarContexto(hotel.id, entrada, salida);
  const lineas = [];
  for (const hab of asignadas) {
    const tipo = tipoPorId.get(hab.tipo_habitacion_id);
    if (!tipo) throw new AppError('El tipo de habitación no está activo', 409, 'TIPO_INVALIDO');
    const cotizacion = cotizarEstadia(ctx, tipo, entrada, salida);
    if (!cotizacion) {
      throw new AppError(`El tipo "${tipo.nombre}" no tiene precio configurado`, 409, 'SIN_PRECIO');
    }
    lineas.push({ habitacion: hab, tipo, cotizacion });
  }

  // ---- servicios adicionales ----
  const serviciosDb = servicios.length
    ? await models.Servicio.findAll({
        where: { id: { [Op.in]: servicios.map((s) => s.servicio_id) }, hotel_id: hotel.id, estado: 'activo' },
        raw: true,
        transaction,
      })
    : [];
  const servicioPorId = new Map(serviciosDb.map((s) => [s.id, s]));
  const lineasServicio = servicios.map((s) => {
    const servicio = servicioPorId.get(Number(s.servicio_id));
    if (!servicio) throw new AppError('Servicio inválido para este hotel', 400, 'SERVICIO_INVALIDO');
    const cantidad = Number(s.cantidad || 1);
    return {
      servicio,
      cantidad,
      precio_unitario: Number(servicio.precio),
      subtotal: redondear(Number(servicio.precio) * cantidad),
    };
  });

  const subtotal = redondear(
    lineas.reduce((s, l) => s + l.cotizacion.subtotal, 0) + lineasServicio.reduce((s, l) => s + l.subtotal, 0)
  );
  const impuestos = redondear((subtotal * C.IVA_PORCENTAJE) / 100);

  return {
    hotel,
    entrada,
    salida,
    noches,
    adultos: Number(adultos),
    ninos: Number(ninos),
    lineas,
    lineasServicio,
    subtotal,
    impuestos,
    total: redondear(subtotal + impuestos),
    comision: redondear((subtotal * Number(hotel.comision_porcentaje)) / 100),
    iva_porcentaje: C.IVA_PORCENTAJE,
  };
}

function serializarPresupuesto(p) {
  const primeraNoche = p.lineas.reduce((s, l) => s + (l.cotizacion.porNoche[0]?.precio || 0), 0);
  return {
    hotel: { id: p.hotel.id, nombre: p.hotel.nombre, slug: p.hotel.slug },
    fecha_entrada: p.entrada,
    fecha_salida: p.salida,
    noches: p.noches,
    adultos: p.adultos,
    ninos: p.ninos,
    habitaciones: p.lineas.map((l) => ({
      tipo_habitacion_id: l.tipo.id,
      tipo: l.tipo.nombre,
      capacidad: l.tipo.capacidad_maxima,
      precio_promedio_noche: l.cotizacion.promedioNoche,
      subtotal: l.cotizacion.subtotal,
      por_noche: l.cotizacion.porNoche,
    })),
    servicios: p.lineasServicio.map((l) => ({
      servicio_id: l.servicio.id,
      nombre: l.servicio.nombre,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      subtotal: l.subtotal,
    })),
    subtotal: p.subtotal,
    iva_porcentaje: p.iva_porcentaje,
    impuestos: p.impuestos,
    total: p.total,
    cancelacion: evaluarCancelacion(p.hotel.politica_cancelacion, {
      fecha_entrada: p.entrada,
      subtotal: p.subtotal,
      primeraNoche,
    }),
    politica: describirPolitica(p.hotel.politica_cancelacion),
  };
}

async function cotizar(payload) {
  const presupuesto = await armarPresupuesto({
    hotelId: payload.hotel_id,
    entrada: payload.fecha_entrada,
    salida: payload.fecha_salida,
    adultos: payload.adultos,
    ninos: payload.ninos,
    items: payload.habitaciones,
    servicios: payload.servicios,
  });
  return serializarPresupuesto(presupuesto);
}

/* ======================================================
   CLIENTE
====================================================== */
async function resolverCliente({ payload, actor, transaction }) {
  const contacto = payload.contacto || {};

  // Staff: cliente existente o datos de contacto nuevos.
  if (esStaff(actor)) {
    if (payload.cliente_id) {
      const c = await models.Cliente.findByPk(payload.cliente_id, { transaction });
      // Un hotel solo puede reutilizar huéspedes que ya se alojaron/reservaron en él (evita leer datos de otros hoteles).
      const esDeEsteHotel =
        c && (esSuperAdmin(actor) || (await models.Reserva.count({ where: { cliente_id: c.id, hotel_id: Number(actor.hotel_id) }, transaction })) > 0);
      if (!esDeEsteHotel) throw new AppError('Cliente no encontrado', 404);
      return c;
    }
    return crearClienteInvitado(contacto, transaction, { porPersonal: true });
  }

  // Usuario autenticado: su perfil de huésped se crea/actualiza automáticamente.
  if (actor) {
    const user = await models.User.findByPk(actor.id, { transaction });
    let cliente = await models.Cliente.findOne({ where: { user_id: user.id }, transaction });
    const datos = {
      telefono: contacto.telefono || undefined,
      documento_identidad: contacto.documento_identidad || undefined,
      tipo_documento: contacto.tipo_documento || undefined,
      nacionalidad: contacto.nacionalidad || undefined,
    };
    Object.keys(datos).forEach((k) => datos[k] === undefined && delete datos[k]);
    if (!cliente) {
      cliente = await models.Cliente.create(
        { user_id: user.id, nombres: user.nombre, apellidos: user.apellido, email: user.email, ...datos },
        { transaction }
      );
    } else if (Object.keys(datos).length) {
      await cliente.update(datos, { transaction });
    }
    return cliente;
  }

  // Invitado.
  return crearClienteInvitado(contacto, transaction);
}

async function crearClienteInvitado(contacto, transaction, { porPersonal = false } = {}) {
  const { nombres, apellidos, email, telefono } = contacto;
  // Web: contacto completo (para confirmar y gestionar la reserva). Recepción: basta el nombre y un medio de contacto
  // (una reserva por teléfono o en mostrador puede no tener correo).
  const completo = porPersonal ? nombres && apellidos && (email || telefono) : nombres && apellidos && email && telefono;
  if (!completo) {
    throw new AppError(
      porPersonal
        ? 'Indica nombres, apellidos y al menos un teléfono o correo del huésped'
        : 'Debes indicar nombres, apellidos, email y teléfono del huésped',
      400,
      'CONTACTO_INCOMPLETO'
    );
  }
  const emailNorm = email ? String(email).trim().toLowerCase() : null;
  return models.Cliente.create(
    {
      nombres,
      apellidos,
      email: emailNorm,
      telefono: telefono || null,
      documento_identidad: contacto.documento_identidad || null,
      tipo_documento: contacto.tipo_documento || null,
      nacionalidad: contacto.nacionalidad || null,
    },
    { transaction }
  );
}

async function verificarTopeReservasWeb({ actor, contacto, transaction }) {
  const base = {
    canal: 'web',
    estado: { [Op.in]: ['pendiente', 'confirmada'] },
    fecha_salida: { [Op.gte]: hoyISO() },
  };
  const activas = actor
    ? await models.Reserva.count({ where: { ...base, user_id: actor.id }, transaction })
    : await models.Reserva.count({
        where: base,
        include: [
          {
            model: models.Cliente,
            as: 'cliente',
            required: true,
            where: { email: String(contacto?.email || '').trim().toLowerCase() },
          },
        ],
        transaction,
      });
  if (activas >= C.MAX_RESERVAS_ACTIVAS_WEB) {
    throw new AppError(
      'Ya tienes varias reservas activas. Cancela alguna o contacta directamente al alojamiento.',
      429,
      'LIMITE_RESERVAS'
    );
  }
}

/* ======================================================
   CREAR
====================================================== */
async function crearReserva(payload, actor = null) {
  const staff = esStaff(actor);
  const hotelId = Number(payload.hotel_id);

  if (staff && !esSuperAdmin(actor) && Number(actor.hotel_id) !== hotelId) {
    throw new AppError('No puedes crear reservas en otro hotel', 403, 'FUERA_DE_ALCANCE');
  }

  const reservaId = await sequelize.transaction(async (t) => {
    // Serializa las reservas de un mismo hotel: evita la doble venta de la última habitación.
    await models.Hotel.findByPk(hotelId, { transaction: t, lock: t.LOCK.UPDATE });

    const presupuesto = await armarPresupuesto({
      hotelId,
      entrada: payload.fecha_entrada,
      salida: payload.fecha_salida,
      adultos: payload.adultos,
      ninos: payload.ninos,
      items: payload.habitaciones,
      servicios: payload.servicios,
      transaction: t,
      permitirHotelInactivo: staff,
    });

    if (!staff) await verificarTopeReservasWeb({ actor, contacto: payload.contacto, transaction: t });

    const cliente = await resolverCliente({ payload, actor, transaction: t });

    // Reserva web con pago online pendiente retiene inventario un tiempo limitado.
    const pagoEnHotel = payload.pago_en_hotel !== false;
    const estado = staff ? payload.estado_inicial || 'confirmada' : pagoEnHotel ? 'confirmada' : 'pendiente';
    const expiraEn =
      estado === 'pendiente' && !staff ? new Date(Date.now() + C.RETENCION_MINUTOS * 60 * 1000) : null;

    let reserva;
    for (let intento = 0; intento < 5 && !reserva; intento += 1) {
      try {
        reserva = await models.Reserva.create(
          {
            cliente_id: cliente.id,
            hotel_id: hotelId,
            user_id: actor && !staff ? actor.id : null,
            codigo_reserva: generarCodigoReserva(),
            fecha_entrada: presupuesto.entrada,
            fecha_salida: presupuesto.salida,
            num_huespedes: presupuesto.adultos + presupuesto.ninos,
            num_ninos: presupuesto.ninos,
            estado,
            canal: staff ? payload.canal || 'recepcion' : 'web',
            subtotal: presupuesto.subtotal,
            impuestos: presupuesto.impuestos,
            precio_total: presupuesto.total,
            comision: presupuesto.comision,
            politica_cancelacion: presupuesto.hotel.politica_cancelacion,
            expira_en: expiraEn,
            observaciones: payload.observaciones || null,
          },
          { transaction: t }
        );
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      }
    }
    if (!reserva) throw new AppError('No se pudo generar el código de reserva', 500);

    for (const l of presupuesto.lineas) {
      await models.DetalleReserva.create(
        {
          reserva_id: reserva.id,
          habitacion_id: l.habitacion.id,
          precio_noche: l.cotizacion.promedioNoche,
          noches: presupuesto.noches,
          subtotal: l.cotizacion.subtotal,
        },
        { transaction: t }
      );
    }
    for (const s of presupuesto.lineasServicio) {
      await models.ServicioReserva.create(
        {
          reserva_id: reserva.id,
          servicio_id: s.servicio.id,
          cantidad: s.cantidad,
          precio_unitario: s.precio_unitario,
          subtotal: s.subtotal,
        },
        { transaction: t }
      );
    }

    // Hoteles conectados a un channel manager: se descuenta el cupo vendido y se avisa la reserva.
    await canales.ajustarVentaLocal({
      tipoIds: presupuesto.lineas.map((l) => l.tipo.id),
      entrada: presupuesto.entrada,
      salida: presupuesto.salida,
      delta: 1,
      transaction: t,
    });
    await salidaCanal.encolar(reserva, 'Commit', t);

    return reserva.id;
  });

  salidaCanal.enviarEnSegundoPlano();
  return obtenerReserva(reservaId, actor, { interno: true });
}

/* ======================================================
   LECTURA
====================================================== */
function conCancelacion(reserva) {
  const json = reserva.toJSON();
  const primeraNoche = (json.detalles || []).reduce((s, d) => s + Number(d.precio_noche), 0);
  json.cancelacion = evaluarCancelacion(json.politica_cancelacion, {
    fecha_entrada: json.fecha_entrada,
    subtotal: json.subtotal,
    primeraNoche,
  });
  json.pagado = redondear(
    (json.pagos || []).filter((p) => p.estado === 'aprobado').reduce((s, p) => s + Number(p.monto), 0)
  );
  json.saldo = redondear(Number(json.precio_total) - json.pagado);
  return json;
}

// Verifica que `actor` puede ver/operar la reserva.
function puedeAcceder(reserva, actor) {
  if (!actor) return false;
  if (esSuperAdmin(actor)) return true;
  if (esStaff(actor)) return Number(actor.hotel_id) === reserva.hotel_id;
  return reserva.user_id !== null && reserva.user_id === actor.id;
}

async function obtenerReserva(id, actor, { interno = false } = {}) {
  const reserva = await models.Reserva.findByPk(id, { include: INCLUDE_COMPLETO() });
  if (!reserva) throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
  if (!interno && !puedeAcceder(reserva, actor)) {
    // 404 y no 403: no revelamos que la reserva existe.
    throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
  }
  return conCancelacion(reserva);
}

// Consulta pública para invitados: código + email de contacto.
async function consultarPorCodigo(codigo, email) {
  const reserva = await models.Reserva.findOne({
    where: { codigo_reserva: String(codigo || '').trim().toUpperCase() },
    include: INCLUDE_COMPLETO(),
  });
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!reserva || !emailNorm || reserva.cliente?.email !== emailNorm) {
    throw new AppError('No encontramos una reserva con esos datos', 404, 'RESERVA_NO_ENCONTRADA');
  }
  return conCancelacion(reserva);
}

async function listarReservas(actor, filtros = {}) {
  const where = {};

  if (esStaff(actor)) {
    if (!esSuperAdmin(actor)) where.hotel_id = actor.hotel_id;
    else if (filtros.hotel_id) where.hotel_id = Number(filtros.hotel_id);
  } else {
    where.user_id = actor.id;
  }

  if (filtros.estado) where.estado = { [Op.in]: [].concat(filtros.estado) };
  if (filtros.desde) where.fecha_salida = { ...(where.fecha_salida || {}), [Op.gte]: filtros.desde };
  if (filtros.hasta) where.fecha_entrada = { ...(where.fecha_entrada || {}), [Op.lte]: filtros.hasta };
  if (filtros.texto) {
    const like = { [Op.like]: `%${String(filtros.texto).trim()}%` };
    where[Op.or] = [
      { codigo_reserva: like },
      { '$cliente.nombres$': like },
      { '$cliente.apellidos$': like },
      { '$cliente.email$': like },
    ];
  }

  const page = Math.max(1, Number(filtros.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filtros.limit) || 20));

  const { rows, count } = await models.Reserva.findAndCountAll({
    where,
    include: [
      { model: models.Cliente, as: 'cliente' },
      { model: models.Hotel, as: 'hotel', attributes: ['id', 'nombre', 'slug', 'imagen_principal'] },
      {
        model: models.DetalleReserva,
        as: 'detalles',
        include: [
          {
            model: models.Habitacion,
            as: 'habitacion',
            attributes: ['id', 'numero_habitacion'],
            include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre'] }],
          },
        ],
      },
      { model: models.Valoracion, as: 'valoracion', attributes: ['id'] },
    ],
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
    subQuery: false,
  });

  return { data: rows, meta: { total: count, page, limit, pages: Math.ceil(count / limit) } };
}

/* ======================================================
   ESTADOS
====================================================== */

// Comprueba que las habitaciones de una reserva siguen libres (p. ej. su retención venció y otro la tomó).
async function asegurarInventario(reserva, transaction) {
  const detalles = await models.DetalleReserva.findAll({
    where: { reserva_id: reserva.id },
    attributes: ['habitacion_id'],
    raw: true,
    transaction,
  });
  const libres = await habitacionesLibres({
    hotelIds: reserva.hotel_id,
    entrada: reserva.fecha_entrada,
    salida: reserva.fecha_salida,
    excluirReservaId: reserva.id,
    transaction,
  });
  const ids = new Set(libres.map((h) => h.id));
  if (detalles.some((d) => !ids.has(d.habitacion_id))) {
    throw new AppError(
      'Las habitaciones de esta reserva ya no están disponibles (la retención venció y fueron ocupadas). Crea una nueva reserva.',
      409,
      'SIN_DISPONIBILIDAD'
    );
  }
}
// verificado: el llamador ya comprobó la identidad (invitado con código + email).
async function cambiarEstado(id, nuevoEstado, actor, { motivo, verificado = false } = {}) {
  return sequelize.transaction(async (t) => {
    const reserva = await models.Reserva.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!reserva || (!verificado && !puedeAcceder(reserva, actor))) {
      throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
    }

    const staff = esStaff(actor);
    if (!staff && nuevoEstado !== 'cancelada') {
      throw new AppError('Solo puedes cancelar tu reserva', 403, 'NO_AUTORIZADO');
    }

    if (!TRANSICIONES[reserva.estado]?.includes(nuevoEstado)) {
      throw new AppError(
        `No se puede pasar de "${reserva.estado}" a "${nuevoEstado}"`,
        409,
        'TRANSICION_INVALIDA'
      );
    }

    if ((nuevoEstado === 'check_in' || nuevoEstado === 'no_show') && reserva.fecha_entrada > hoyISO()) {
      throw new AppError('Aún no es la fecha de entrada de esta reserva', 409, 'FECHA_FUTURA');
    }

    if (nuevoEstado === 'confirmada') {
      await models.Hotel.findByPk(reserva.hotel_id, { transaction: t, lock: t.LOCK.UPDATE });
      await asegurarInventario(reserva, t);
    }

    const cambios = { estado: nuevoEstado };
    if (nuevoEstado === 'cancelada') {
      cambios.cancelada_en = new Date();
      cambios.motivo_cancelacion = motivo || null;
    }
    if (nuevoEstado === 'confirmada') cambios.expira_en = null;
    const estabaActiva = C.ESTADOS_RESERVA_ACTIVOS.includes(reserva.estado);
    await reserva.update(cambios, { transaction: t });

    // Al cancelar se libera el cupo local y se avisa al channel manager.
    if (nuevoEstado === 'cancelada' && estabaActiva) await liberarEnCanal(reserva, t);

    if (nuevoEstado === 'check_in' || nuevoEstado === 'check_out') {
      const detalles = await models.DetalleReserva.findAll({
        where: { reserva_id: reserva.id },
        attributes: ['habitacion_id'],
        raw: true,
        transaction: t,
      });
      await models.Habitacion.update(
        { estado: nuevoEstado === 'check_in' ? 'ocupada' : 'limpieza' },
        { where: { id: { [Op.in]: detalles.map((d) => d.habitacion_id) } }, transaction: t }
      );
    }

    return reserva.id;
  }).then((rid) => {
    salidaCanal.enviarEnSegundoPlano();
    return obtenerReserva(rid, actor, { interno: verificado });
  });
}

// Invitado (sin cuenta) cancela con código + email de contacto.
async function cancelarComoInvitado(codigo, email, motivo) {
  const reserva = await consultarPorCodigo(codigo, email); // 404 si no coincide
  return cambiarEstado(reserva.id, 'cancelada', null, { motivo, verificado: true });
}

async function actualizarReserva(id, data, actor) {
  const reserva = await models.Reserva.findByPk(id);
  if (!reserva || !puedeAcceder(reserva, actor) || !esStaff(actor)) {
    throw new AppError('Reserva no encontrada', 404, 'RESERVA_NO_ENCONTRADA');
  }
  if (['cancelada', 'check_out', 'no_show'].includes(reserva.estado)) {
    throw new AppError('Esta reserva ya no se puede modificar', 409);
  }
  const permitidos = {};
  if (data.observaciones !== undefined) permitidos.observaciones = data.observaciones;
  await reserva.update(permitidos);
  return obtenerReserva(id, actor);
}

// Libera (cancela) las reservas pendientes cuya retención venció. Se puede ejecutar con un cron.
async function expirarReservasPendientes(ahora = new Date()) {
  const vencidas = await models.Reserva.findAll({ where: { estado: 'pendiente', expira_en: { [Op.lt]: ahora } } });
  for (const reserva of vencidas) {
    await sequelize.transaction(async (t) => {
      await reserva.update({ estado: 'cancelada', cancelada_en: ahora, motivo_cancelacion: 'Expiró el tiempo de pago' }, { transaction: t });
      await liberarEnCanal(reserva, t);
    });
  }
  if (vencidas.length) salidaCanal.enviarEnSegundoPlano();
  return vencidas.length;
}

// Libera el cupo descontado localmente y encola el Cancel al channel manager (si el hotel está conectado).
async function liberarEnCanal(reserva, transaction) {
  const detalles = await models.DetalleReserva.findAll({
    where: { reserva_id: reserva.id },
    include: [{ model: models.Habitacion, as: 'habitacion', attributes: ['tipo_habitacion_id'] }],
    transaction,
  });
  await canales.ajustarVentaLocal({
    tipoIds: detalles.map((d) => d.habitacion.tipo_habitacion_id),
    entrada: reserva.fecha_entrada,
    salida: reserva.fecha_salida,
    delta: -1,
    transaction,
  });
  await salidaCanal.encolar(reserva, 'Cancel', transaction);
}

module.exports = {
  cotizar,
  crearReserva,
  obtenerReserva,
  consultarPorCodigo,
  cancelarComoInvitado,
  listarReservas,
  cambiarEstado,
  actualizarReserva,
  expirarReservasPendientes,
  asegurarInventario,
  TRANSICIONES,
};
