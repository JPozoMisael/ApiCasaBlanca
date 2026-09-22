const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { models } = require('../../models');
const C = require('../../config/constants');
const { esFechaValida, diasEntre, sumarDias } = require('../../utils/dates');
const { redondear } = require('../../utils/money');
const { leerSoap, respuesta, arreglo, esc } = require('./xml');

/*
| Mensajes que SiteMinder envía al canal (SiteConnect API):
|   OTA_HotelAvailRQ            → catálogo de habitaciones y tarifas ("Rooms and Rates")
|   OTA_HotelAvailNotifRQ       → disponibilidad y restricciones (stop sell, llegada/salida cerrada, estancia mínima/máxima)
|   OTA_HotelRateAmountNotifRQ  → tarifas
| Errores: se devuelven DENTRO del mensaje OTA (Type/Code), no como códigos HTTP.
| Códigos según https://developer.siteminder.com/siteconnect-api/guides/error-handling.md
*/

const MAX_DIAS_POR_MENSAJE = 800;
const MAX_MENSAJES = 2000;

const ERR = {
  autenticacion: { tipo: 4, codigo: 448, texto: 'Invalid Username and/or Password' },
  hotelNoEncontrado: (c) => ({ tipo: 6, codigo: 392, texto: `Hotel not found for HotelCode=${c}` }),
  hotelInactivo: { tipo: 6, codigo: 375, texto: 'Hotel not active' },
  habitacionDesconocida: { tipo: 12, codigo: 402, texto: 'Room type code not found for this hotel' },
  tarifaDesconocida: { tipo: 12, codigo: 249, texto: 'Rate code not found for this hotel' },
  campoFaltante: (t) => ({ tipo: 10, codigo: 321, texto: `Required field missing: ${t}` }),
  noProcesable: (t) => ({ tipo: 3, codigo: 450, texto: `Unable to process: ${t}` }),
  sinImplementar: (op) => ({ tipo: 2, codigo: 450, texto: `Unable to process: ${op} is not implemented` }),
  sistema: { tipo: 13, codigo: 448, texto: 'System error' },
};

class ErrorOTA extends Error {
  constructor(error) {
    super(error.texto);
    this.error = error;
  }
}

/* ---------- autenticación (WS-Security UsernameToken) ---------- */
const iguales = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const y = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(x, y);
};

function credencialesConfiguradas() {
  return Boolean(process.env.SITEMINDER_USER && process.env.SITEMINDER_PASSWORD);
}

function autenticar(usuario, password) {
  // Se comparan ambos siempre (sin cortocircuito) para no filtrar cuál falló.
  const okUsuario = iguales(usuario, process.env.SITEMINDER_USER);
  const okPassword = iguales(password, process.env.SITEMINDER_PASSWORD);
  return okUsuario && okPassword;
}

/* ---------- utilidades ---------- */
const attr = (nodo, nombre) => nodo?.[`@_${nombre}`];

async function resolverConexion(hotelCode) {
  if (!hotelCode) throw new ErrorOTA(ERR.campoFaltante('HotelCode'));
  const conexion = await models.CanalConexion.findOne({
    where: { codigo_hotel: String(hotelCode), proveedor: 'siteminder' },
    include: [{ model: models.Hotel, as: 'hotel', attributes: ['id', 'estado'] }],
  });
  if (!conexion) throw new ErrorOTA(ERR.hotelNoEncontrado(hotelCode));
  if (conexion.hotel.estado !== 'activo') throw new ErrorOTA(ERR.hotelInactivo);
  return conexion;
}

// Valida el rango de fechas de un StatusApplicationControl y devuelve las fechas (inclusive).
function fechasDe(sac) {
  const inicio = attr(sac, 'Start');
  const fin = attr(sac, 'End') ?? inicio;
  if (!esFechaValida(inicio) || !esFechaValida(fin)) throw new ErrorOTA(ERR.campoFaltante('StatusApplicationControl Start/End (YYYY-MM-DD)'));
  const total = diasEntre(inicio, fin) + 1;
  if (fin < inicio || total > MAX_DIAS_POR_MENSAJE) throw new ErrorOTA(ERR.noProcesable('rango de fechas inválido o mayor a 800 días'));
  return Array.from({ length: total }, (_, i) => sumarDias(inicio, i));
}

function validarTarifa(sac, conexion) {
  const plan = attr(sac, 'RatePlanCode');
  if (plan && plan !== conexion.plan_tarifa_codigo) throw new ErrorOTA(ERR.tarifaDesconocida);
}

async function mapeoPorCodigo(conexion) {
  const mapeos = await models.CanalMapeo.findAll({ where: { conexion_id: conexion.id }, raw: true });
  return new Map(mapeos.map((m) => [m.codigo_habitacion, m]));
}

/* ---------- OTA_HotelAvailRQ: habitaciones y tarifas ---------- */
async function manejarHabitacionesYTarifas(cuerpo) {
  const segmento = arreglo(cuerpo?.AvailRequestSegments?.AvailRequestSegment)[0];
  const hotelCode = attr(segmento?.HotelSearchCriteria?.Criterion?.HotelRef, 'HotelCode');
  const conexion = await resolverConexion(hotelCode);

  const mapeos = await models.CanalMapeo.findAll({
    where: { conexion_id: conexion.id },
    include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', where: { estado: 'activo' }, required: true }],
    order: [['id', 'ASC']],
  });

  // Cada combinación habitación-tarifa va en su propio RoomStay y (nombre habitación + nombre tarifa) es único.
  const interior =
    '<RoomStays>' +
    mapeos
      .map((m) => {
        const t = m.tipoHabitacion;
        return (
          `<RoomStay><RoomTypes><RoomType RoomTypeCode="${esc(m.codigo_habitacion)}">` +
          `<RoomDescription Name="${esc(t.nombre)}"><Text>${esc(t.descripcion || t.nombre)}</Text></RoomDescription>` +
          `<Occupancy AgeQualifyingCode="10" MaxOccupancy="${Number(t.capacidad_maxima)}"/></RoomType></RoomTypes>` +
          `<RatePlans><RatePlan RatePlanCode="${esc(conexion.plan_tarifa_codigo)}">` +
          `<RatePlanDescription Name="Tarifa estándar"><Text>Tarifa estándar por noche, sin impuestos</Text></RatePlanDescription>` +
          `</RatePlan></RatePlans></RoomStay>`
        );
      })
      .join('') +
    '</RoomStays>';

  return { conexion, interior };
}

/* ---------- OTA_HotelAvailNotifRQ: disponibilidad y restricciones ---------- */
function cambiosDeDisponibilidad(msg) {
  const c = {};
  const limite = attr(msg, 'BookingLimit');
  if (limite !== undefined) {
    const n = Number(limite);
    if (!Number.isInteger(n) || n < 0) throw new ErrorOTA(ERR.noProcesable('BookingLimit inválido'));
    c.disponibles = n;
    c.vendidas_local = 0; // el channel manager ya contempla nuestras ventas: se reinicia el descuento local
  }

  const restriccion = msg.RestrictionStatus;
  if (restriccion) {
    const cerrar = attr(restriccion, 'Status') === 'Close';
    const cual = attr(restriccion, 'Restriction');
    if (!cual) c.cerrado = cerrar; // Close sin "Restriction" = stop sell (cero disponibilidad); Open lo restaura
    else if (cual === 'Arrival') c.cerrado_llegada = cerrar;
    else if (cual === 'Departure') c.cerrado_salida = cerrar;
  }

  const estancias = arreglo(msg.LengthsOfStay?.LengthOfStay);
  for (const e of estancias) {
    const tipo = attr(e, 'MinMaxMessageType');
    const tiempo = attr(e, 'Time');
    const valor = tiempo === undefined || tiempo === '' ? null : Number(tiempo);
    if (valor !== null && (!Number.isInteger(valor) || valor < 1)) throw new ErrorOTA(ERR.noProcesable('LengthOfStay Time inválido'));
    // Sin Time, la restricción se elimina.
    if (tipo === 'SetMinLOS' || tipo === 'SetForwardMinStay') c.min_estancia = valor;
    else if (tipo === 'SetMaxLOS' || tipo === 'SetForwardMaxStay') c.max_estancia = valor;
  }
  return c;
}

async function guardarPorFechas({ conexion, mapeo, fechas, cambios, transaction }) {
  const existentes = await models.CanalInventario.findAll({
    where: { tipo_habitacion_id: mapeo.tipo_habitacion_id, fecha: { [Op.in]: fechas } },
    transaction,
  });
  const porFecha = new Map(existentes.map((f) => [f.fecha, f]));

  const nuevos = [];
  for (const fecha of fechas) {
    const fila = porFecha.get(fecha);
    if (fila) await fila.update(cambios, { transaction });
    else nuevos.push({ conexion_id: conexion.id, hotel_id: conexion.hotel_id, tipo_habitacion_id: mapeo.tipo_habitacion_id, fecha, ...cambios });
  }
  if (nuevos.length) await models.CanalInventario.bulkCreate(nuevos, { transaction });
}

async function manejarDisponibilidad(cuerpo) {
  const contenedor = cuerpo?.AvailStatusMessages;
  const conexion = await resolverConexion(attr(contenedor, 'HotelCode'));
  const mensajes = arreglo(contenedor?.AvailStatusMessage);
  if (mensajes.length > MAX_MENSAJES) throw new ErrorOTA(ERR.noProcesable('demasiados mensajes'));

  const mapeos = await mapeoPorCodigo(conexion);
  // Se valida TODO antes de aplicar: o se aplica completo o nada.
  const trabajo = mensajes.map((msg) => {
    const sac = msg.StatusApplicationControl;
    const mapeo = mapeos.get(attr(sac, 'InvTypeCode'));
    if (!mapeo) throw new ErrorOTA(ERR.habitacionDesconocida);
    validarTarifa(sac, conexion);
    return { mapeo, fechas: fechasDe(sac), cambios: cambiosDeDisponibilidad(msg) };
  });

  await sequelize.transaction(async (transaction) => {
    for (const t of trabajo) if (Object.keys(t.cambios).length) await guardarPorFechas({ conexion, ...t, transaction });
  });
  return { conexion };
}

/* ---------- OTA_HotelRateAmountNotifRQ: tarifas ---------- */
function precioDeTarifa(rate, conexion) {
  const montos = arreglo(rate?.BaseByGuestAmts?.BaseByGuestAmt);
  if (!montos.length) throw new ErrorOTA(ERR.campoFaltante('BaseByGuestAmt'));
  // Precio por habitación y noche: se toma el de 2 huéspedes si hay tarifa por ocupación; si no, el único disponible.
  const monto = montos.find((m) => attr(m, 'NumberOfGuests') === '2') ?? montos[0];

  const moneda = attr(monto, 'CurrencyCode');
  if (moneda && moneda !== conexion.moneda) throw new ErrorOTA(ERR.noProcesable(`la moneda ${moneda} no está soportada (solo ${conexion.moneda})`));

  const antes = attr(monto, 'AmountBeforeTax');
  const despues = attr(monto, 'AmountAfterTax');
  let precio;
  if (antes !== undefined) precio = Number(antes);
  else if (despues !== undefined) precio = conexion.precios_incluyen_impuestos ? Number(despues) / (1 + C.IVA_PORCENTAJE / 100) : Number(despues);
  else throw new ErrorOTA(ERR.campoFaltante('AmountBeforeTax / AmountAfterTax'));

  if (!Number.isFinite(precio) || precio < 0) throw new ErrorOTA(ERR.noProcesable('monto inválido'));
  return redondear(precio);
}

async function manejarTarifas(cuerpo) {
  const contenedor = cuerpo?.RateAmountMessages;
  const conexion = await resolverConexion(attr(contenedor, 'HotelCode'));
  const mensajes = arreglo(contenedor?.RateAmountMessage);
  if (mensajes.length > MAX_MENSAJES) throw new ErrorOTA(ERR.noProcesable('demasiados mensajes'));

  const mapeos = await mapeoPorCodigo(conexion);
  const trabajo = mensajes.map((msg) => {
    const sac = msg.StatusApplicationControl;
    const mapeo = mapeos.get(attr(sac, 'InvTypeCode'));
    if (!mapeo) throw new ErrorOTA(ERR.habitacionDesconocida);
    validarTarifa(sac, conexion);
    const rate = arreglo(msg.Rates?.Rate)[0];
    return { mapeo, fechas: fechasDe(sac), cambios: { precio: precioDeTarifa(rate, conexion) } };
  });

  await sequelize.transaction(async (transaction) => {
    for (const t of trabajo) await guardarPorFechas({ conexion, ...t, transaction });
  });
  return { conexion };
}

/* ---------- despachador ---------- */
const OPERACIONES = {
  OTA_HotelAvailRQ: { rs: 'OTA_HotelAvailRS', manejar: manejarHabitacionesYTarifas, marcaActividad: false },
  OTA_HotelAvailNotifRQ: { rs: 'OTA_HotelAvailNotifRS', manejar: manejarDisponibilidad, marcaActividad: true },
  OTA_HotelRateAmountNotifRQ: { rs: 'OTA_HotelRateAmountNotifRS', manejar: manejarTarifas, marcaActividad: true },
};

async function registrar({ conexion, operacion, resultado, echoToken, detalle, ms }) {
  try {
    await models.CanalMensaje.create({
      conexion_id: conexion?.id ?? null,
      hotel_id: conexion?.hotel_id ?? null,
      direccion: 'entrada',
      tipo: operacion,
      resultado,
      echo_token: echoToken ? String(echoToken).slice(0, 64) : null,
      detalle: detalle ? String(detalle).slice(0, 500) : null,
      ms,
    });
  } catch {
    /* la bitácora nunca debe romper la respuesta */
  }
}

/**
 * Procesa un mensaje SOAP entrante.
 * @returns {{ status: number, xml: string }}
 */
async function procesar(xmlEntrada) {
  const inicio = Date.now();

  if (!credencialesConfiguradas()) {
    return { status: 503, xml: 'Canal SiteMinder no configurado (faltan SITEMINDER_USER / SITEMINDER_PASSWORD)' };
  }

  let mensaje;
  try {
    mensaje = leerSoap(xmlEntrada);
  } catch (e) {
    return { status: 400, xml: e.message };
  }

  const { operacion, cuerpo } = mensaje;
  const definicion = OPERACIONES[operacion];
  const echoToken = attr(cuerpo, 'EchoToken') ?? '';
  const nombreRS = definicion?.rs ?? operacion.replace(/RQ$/, 'RS');

  if (!autenticar(mensaje.usuario, mensaje.password)) {
    await registrar({ operacion, resultado: 'error', echoToken, detalle: 'autenticación fallida', ms: Date.now() - inicio });
    return { status: 200, xml: respuesta(nombreRS, echoToken, { errores: [ERR.autenticacion] }) };
  }
  if (!definicion) {
    await registrar({ operacion, resultado: 'error', echoToken, detalle: 'operación no implementada' });
    return { status: 200, xml: respuesta(nombreRS, echoToken, { errores: [ERR.sinImplementar(operacion)] }) };
  }

  let conexion = null;
  try {
    const r = await definicion.manejar(cuerpo);
    conexion = r.conexion;

    if (definicion.marcaActividad) {
      const cambios = { ultima_entrada_en: new Date(), ultimo_error: null };
      if (conexion.estado === 'pendiente') cambios.estado = 'activa'; // primer envío correcto → conexión activa
      await conexion.update(cambios);
    }
    await registrar({ conexion, operacion, resultado: 'ok', echoToken, ms: Date.now() - inicio });
    return { status: 200, xml: respuesta(nombreRS, echoToken, { interior: r.interior || '' }) };
  } catch (err) {
    const error = err instanceof ErrorOTA ? err.error : ERR.sistema;
    if (!(err instanceof ErrorOTA)) console.error('Error en canal SiteMinder:', err);
    const hotelCode = attr(cuerpo?.AvailStatusMessages ?? cuerpo?.RateAmountMessages, 'HotelCode');
    conexion = conexion || (hotelCode ? await models.CanalConexion.findOne({ where: { codigo_hotel: String(hotelCode) } }) : null);
    if (conexion && definicion.marcaActividad) await conexion.update({ ultimo_error: error.texto.slice(0, 500) }).catch(() => {});
    await registrar({ conexion, operacion, resultado: 'error', echoToken, detalle: error.texto, ms: Date.now() - inicio });
    return { status: 200, xml: respuesta(nombreRS, echoToken, { errores: [error] }) };
  }
}

module.exports = { procesar, credencialesConfiguradas, ERR };
