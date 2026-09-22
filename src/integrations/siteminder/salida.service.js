const { Op } = require('sequelize');
const { models } = require('../../models');
const C = require('../../config/constants');
const { redondear } = require('../../utils/money');
const { leerSoap, sobreConSeguridad, esc, marcaTiempo, NS_OTA } = require('./xml');
const { sumarDias } = require('../../utils/dates');
const crypto = require('crypto');

/*
| Envío de reservas al channel manager (OTA_HotelResNotifRQ: Commit / Cancel), con cola y reintentos.
| Reglas de SiteMinder: https://developer.siteminder.com/siteconnect-api/reference/reservations.md
|   - SOAP 1.1 con WS-Security; respuesta sincrónica <Success/> o <Errors>.
|   - Si responde <Errors>, NO se reintenta (la reserva queda marcada con error para revisión manual).
|   - Solo se reintenta ante fallos de red, tiempo de espera o errores 5xx.
|   - Nunca se envía Cancel de una reserva que no se entregó.
*/

const ESPERAS_S = [30, 120, 300, 900, 3600, 7200, 14400]; // 8 intentos en total
const TIMEOUT_MS = 60 * 1000;

const config = () => ({
  url: process.env.SITEMINDER_RES_URL,
  usuario: process.env.SITEMINDER_OUT_USER,
  password: process.env.SITEMINDER_OUT_PASSWORD,
  canal: process.env.SITEMINDER_CHANNEL_CODE,
});
const envioConfigurado = () => {
  const c = config();
  return Boolean(c.url && c.usuario && c.password && c.canal);
};

/* ======================================================
   COLA
====================================================== */
async function conexionActiva(hotelId, transaction) {
  return models.CanalConexion.findOne({ where: { hotel_id: hotelId, proveedor: 'siteminder', estado: 'activa' }, transaction });
}

/**
 * Encola el aviso de una reserva al channel manager. Solo reservas hechas por la web en hoteles con conexión activa.
 * @param accion 'Commit' | 'Cancel'
 */
async function encolar(reserva, accion, transaction) {
  if (reserva.canal !== 'web') return null;
  const conexion = await conexionActiva(reserva.hotel_id, transaction);
  if (!conexion) return null;

  const previa = await models.CanalSalida.findOne({ where: { reserva_id: reserva.id, accion: 'Commit' }, transaction });

  if (accion === 'Commit') {
    if (previa) return previa;
    return models.CanalSalida.create({ conexion_id: conexion.id, hotel_id: reserva.hotel_id, reserva_id: reserva.id, accion: 'Commit' }, { transaction });
  }

  // Cancel: si el Commit nunca llegó al channel manager, no hay nada que cancelar allá.
  if (!previa) return null;
  if (previa.estado === 'pendiente') {
    await previa.update({ estado: 'omitido', ultimo_error: 'Reserva cancelada antes de enviarse' }, { transaction });
    return null;
  }
  if (previa.estado !== 'enviado') return null;
  const yaCancelada = await models.CanalSalida.findOne({ where: { reserva_id: reserva.id, accion: 'Cancel' }, transaction });
  if (yaCancelada) return yaCancelada;
  return models.CanalSalida.create({ conexion_id: conexion.id, hotel_id: reserva.hotel_id, reserva_id: reserva.id, accion: 'Cancel' }, { transaction });
}

/* ======================================================
   XML
====================================================== */
const monto = (n) => Number(n).toFixed(2);
const iso = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, '+00:00');

function impuestosDe(antes) {
  const despues = redondear(antes * (1 + C.IVA_PORCENTAJE / 100));
  return { antes: redondear(antes), despues, impuesto: redondear(despues - antes) };
}

const bloqueImporte = (etiqueta, antes, moneda) => {
  const t = impuestosDe(antes);
  return (
    `<${etiqueta} AmountBeforeTax="${monto(t.antes)}" AmountAfterTax="${monto(t.despues)}" CurrencyCode="${esc(moneda)}">` +
    `<Taxes><Tax Type="inclusive" Code="35" Amount="${monto(t.impuesto)}" CurrencyCode="${esc(moneda)}"/></Taxes></${etiqueta}>`
  );
};

function construirReservaXml({ reserva, conexion, mapeos, canal }) {
  const moneda = conexion.moneda;
  const codigoPorTipo = new Map(mapeos.map((m) => [m.tipo_habitacion_id, m.codigo_habitacion]));
  const accion = reserva._accion;
  const idAlfanumerico = reserva.codigo_reserva.replace(/[^A-Za-z0-9]/g, '');
  const habitaciones = reserva.detalles;

  // Reparto de huéspedes: al menos un adulto por habitación; los niños en la primera.
  const adultosTotales = Math.max(habitaciones.length, reserva.num_huespedes - reserva.num_ninos);
  const base = Math.floor(adultosTotales / habitaciones.length);
  const resto = adultosTotales % habitaciones.length;

  const sumaSubtotales = habitaciones.reduce((s, d) => s + Number(d.subtotal), 0) || 1;

  const roomStays = habitaciones
    .map((d, i) => {
      const tipo = d.habitacion.tipoHabitacion;
      const codigoHab = codigoPorTipo.get(tipo.id) ?? `TIPO${tipo.id}`;
      const noches = Number(d.noches);
      const subtotal = Number(d.subtotal);

      // Una tarifa por noche; la última absorbe el redondeo para que la suma coincida con el subtotal.
      const porNoche = redondear(subtotal / noches);
      let acumulado = 0;
      const tarifas = Array.from({ length: noches }, (_, n) => {
        const valor = n === noches - 1 ? redondear(subtotal - acumulado) : porNoche;
        acumulado += valor;
        const desde = sumarDias(reserva.fecha_entrada, n);
        return (
          `<Rate UnitMultiplier="1" RateTimeUnit="Day" EffectiveDate="${desde}" ExpireDate="${sumarDias(desde, 1)}">` +
          `${bloqueImporte('Base', valor, moneda)}${bloqueImporte('Total', valor, moneda)}</Rate>`
        );
      }).join('');

      const adultos = base + (i < resto ? 1 : 0);
      const comision = redondear(Number(reserva.comision) * (subtotal / sumaSubtotales));

      return (
        `<RoomStay><RoomTypes><RoomType RoomTypeCode="${esc(codigoHab)}"><RoomDescription Name="${esc(tipo.nombre)}">${esc(tipo.nombre)}</RoomDescription></RoomType></RoomTypes>` +
        `<RatePlans><RatePlan RatePlanCode="${esc(conexion.plan_tarifa_codigo)}"><RatePlanDescription>Tarifa estándar</RatePlanDescription>` +
        `<Commission><CommissionPayableAmount Amount="${monto(comision)}" CurrencyCode="${esc(moneda)}"/></Commission></RatePlan></RatePlans>` +
        `<RoomRates><RoomRate RoomTypeCode="${esc(codigoHab)}" RatePlanCode="${esc(conexion.plan_tarifa_codigo)}" NumberOfUnits="1"><Rates>${tarifas}</Rates></RoomRate></RoomRates>` +
        `<GuestCounts><GuestCount AgeQualifyingCode="10" Count="${adultos}"/>${i === 0 && reserva.num_ninos ? `<GuestCount AgeQualifyingCode="8" Age="8" Count="${reserva.num_ninos}"/>` : ''}</GuestCounts>` +
        `<TimeSpan Start="${reserva.fecha_entrada}" End="${reserva.fecha_salida}"/>` +
        `${bloqueImporte('Total', subtotal, moneda)}` +
        `<BasicPropertyInfo HotelCode="${esc(conexion.codigo_hotel)}" HotelName="${esc(reserva.hotel.nombre)}"/></RoomStay>`
      );
    })
    .join('');

  const servicios = reserva.servicios.length
    ? '<Services>' +
      reserva.servicios
        .map((s, i) => {
          const unitario = Number(s.precio_unitario);
          return (
            `<Service ServiceInventoryCode="SVC${s.servicio_id}" Inclusive="true" ServiceRPH="${i + 1}" Quantity="${s.cantidad}" ID="${s.id}">` +
            `<Price>${bloqueImporte('Base', unitario, moneda)}${bloqueImporte('Total', Number(s.subtotal), moneda)}` +
            `<RateDescription><Text>${esc(s.servicio?.nombre ?? 'Servicio')}</Text></RateDescription></Price>` +
            `<ServiceDetails><TimeSpan Start="${reserva.fecha_entrada}" End="${reserva.fecha_salida}"/></ServiceDetails></Service>`
          );
        })
        .join('') +
      '</Services>'
    : '';

  const cliente = reserva.cliente;
  const huesped =
    `<ResGuests><ResGuest ResGuestRPH="1" PrimaryIndicator="1"><Profiles><ProfileInfo><Profile ProfileType="1"><Customer>` +
    `<PersonName><GivenName>${esc(cliente.nombres)}</GivenName><Surname>${esc(cliente.apellidos)}</Surname></PersonName>` +
    `${cliente.telefono ? `<Telephone PhoneNumber="${esc(cliente.telefono)}"/>` : ''}` +
    `${cliente.email ? `<Email>${esc(cliente.email)}</Email>` : ''}` +
    `${cliente.nacionalidad ? `<Address><CountryName>${esc(cliente.nacionalidad)}</CountryName></Address>` : ''}` +
    `</Customer></Profile></ProfileInfo></Profiles></ResGuest></ResGuests>`;

  const total = redondear(Number(reserva.subtotal));
  const comentario =
    accion === 'Cancel' ? `<Comments><Comment><Text>${esc(reserva.motivo_cancelacion || 'Cancelada por el huésped')}</Text></Comment></Comments>` : '';
  const totalGlobal = accion === 'Cancel' ? '<Total CurrencyCode="' + esc(moneda) + '" AmountBeforeTax="0.00" AmountAfterTax="0.00"><TPA_Extensions><Total includesCommission="true"/></TPA_Extensions></Total>' : null;
  const t = impuestosDe(total);
  const totalNormal =
    `<Total CurrencyCode="${esc(moneda)}" AmountBeforeTax="${monto(t.antes)}" AmountAfterTax="${monto(t.despues)}">` +
    `<Taxes><Tax Type="inclusive" Code="35" Amount="${monto(t.impuesto)}" CurrencyCode="${esc(moneda)}"/></Taxes>` +
    `<TPA_Extensions><Total includesCommission="true"/></TPA_Extensions></Total>`;

  const atributosReserva =
    `CreateDateTime="${iso(reserva.createdAt)}"` + (accion === 'Cancel' ? ` LastModifyDateTime="${iso(reserva.cancelada_en || new Date())}"` : '');

  return (
    `<OTA_HotelResNotifRQ xmlns="${NS_OTA}" ResStatus="${accion}" EchoToken="${crypto.randomUUID()}" TimeStamp="${marcaTiempo()}" Version="1.0">` +
    `<POS><Source><RequestorID Type="22" ID="${esc(canal)}"/><BookingChannel Primary="true"><CompanyName Code="${esc(canal)}">${esc(C.APP_NAME)}</CompanyName></BookingChannel></Source></POS>` +
    `<HotelReservations><HotelReservation ${atributosReserva}>` +
    `<UniqueID Type="14" ID="${esc(idAlfanumerico)}"/>` +
    `<RoomStays>${roomStays}</RoomStays>${servicios}${huesped}` +
    `<ResGlobalInfo><HotelReservationIDs><HotelReservationID ResID_Type="14" ResID_Value="${esc(idAlfanumerico)}"/></HotelReservationIDs>` +
    `${comentario}${totalGlobal ?? totalNormal}</ResGlobalInfo>` +
    `</HotelReservation></HotelReservations></OTA_HotelResNotifRQ>`
  );
}

async function cargarReserva(reservaId, accion) {
  const reserva = await models.Reserva.findByPk(reservaId, {
    include: [
      { model: models.Hotel, as: 'hotel', attributes: ['id', 'nombre'] },
      { model: models.Cliente, as: 'cliente' },
      {
        model: models.DetalleReserva,
        as: 'detalles',
        include: [{ model: models.Habitacion, as: 'habitacion', include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre'] }] }],
      },
      { model: models.ServicioReserva, as: 'servicios', include: [{ model: models.Servicio, as: 'servicio', attributes: ['nombre'] }] },
    ],
  });
  if (reserva) reserva._accion = accion;
  return reserva;
}

/* ======================================================
   ENVÍO
====================================================== */
async function bitacora(fila, resultado, detalle, ms) {
  try {
    await models.CanalMensaje.create({
      conexion_id: fila.conexion_id, hotel_id: fila.hotel_id, direccion: 'salida',
      tipo: `OTA_HotelResNotifRQ:${fila.accion}`, resultado, detalle: detalle ? String(detalle).slice(0, 500) : null, ms,
    });
  } catch {
    /* la bitácora no debe romper el envío */
  }
}

// Interpreta la respuesta del channel manager: { ok: true } | { ok: false, texto }
function interpretarRespuesta(texto) {
  try {
    const { cuerpo } = leerSoap(texto);
    if (cuerpo?.Errors) {
      const e = Array.isArray(cuerpo.Errors.Error) ? cuerpo.Errors.Error[0] : cuerpo.Errors.Error;
      return { ok: false, texto: `${e?.['@_Code'] ?? ''} ${e?.['#text'] ?? 'error'}`.trim() };
    }
    if (cuerpo && 'Success' in cuerpo) return { ok: true };
  } catch {
    /* respuesta ilegible */
  }
  return { ok: null };
}

let enCurso = false;

/**
 * Envía las reservas pendientes de la cola. Se ejecuta cada 30 s desde server.js y justo después de reservar.
 * @param opciones.fetchImpl  para pruebas
 */
async function enviarPendientes({ ahora = new Date(), limite = 25, fetchImpl = fetch } = {}) {
  if (enCurso) return { enviados: 0, reintentos: 0, errores: 0, omitido: 'en curso' };
  if (!envioConfigurado()) return { enviados: 0, reintentos: 0, errores: 0, omitido: 'envío no configurado' };
  enCurso = true;

  const resumen = { enviados: 0, reintentos: 0, errores: 0 };
  try {
    const cfg = config();
    const cola = await models.CanalSalida.findAll({
      where: { estado: 'pendiente', proximo_intento: { [Op.lte]: ahora } },
      order: [['id', 'ASC']],
      limit: limite,
    });

    for (const fila of cola) {
      const [conexion, reserva, mapeos] = await Promise.all([
        models.CanalConexion.findByPk(fila.conexion_id),
        cargarReserva(fila.reserva_id, fila.accion),
        models.CanalMapeo.findAll({ where: { conexion_id: fila.conexion_id }, raw: true }),
      ]);
      if (!conexion || !reserva) {
        await fila.update({ estado: 'error', ultimo_error: 'Reserva o conexión inexistente' });
        resumen.errores += 1;
        continue;
      }

      const xml = sobreConSeguridad(cfg.usuario, cfg.password, construirReservaXml({ reserva, conexion, mapeos, canal: cfg.canal }));
      const inicio = Date.now();
      let resultado;
      let fallaTransitoria = null;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        const res = await fetchImpl(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8' }, body: xml, signal: ctrl.signal });
        clearTimeout(timer);
        const texto = await res.text();
        if (res.status >= 500) fallaTransitoria = `HTTP ${res.status}`;
        else resultado = interpretarRespuesta(texto);
        if (!fallaTransitoria && resultado.ok === null) fallaTransitoria = `respuesta no reconocida (HTTP ${res.status})`;
      } catch (e) {
        fallaTransitoria = e.name === 'AbortError' ? 'tiempo de espera agotado' : `sin conexión: ${e.message}`;
      }
      const ms = Date.now() - inicio;

      if (!fallaTransitoria && resultado.ok) {
        await fila.update({ estado: 'enviado', enviado_en: new Date(), intentos: fila.intentos + 1, ultimo_error: null });
        await bitacora(fila, 'ok', null, ms);
        resumen.enviados += 1;
      } else if (!fallaTransitoria) {
        // El channel manager rechazó el mensaje: no se reintenta (regla de SiteMinder); requiere revisión.
        await fila.update({ estado: 'error', intentos: fila.intentos + 1, ultimo_error: resultado.texto });
        await conexion.update({ ultimo_error: `Reserva ${reserva.codigo_reserva}: ${resultado.texto}`.slice(0, 500) });
        await bitacora(fila, 'error', resultado.texto, ms);
        resumen.errores += 1;
      } else {
        const intentos = fila.intentos + 1;
        const espera = ESPERAS_S[Math.min(intentos - 1, ESPERAS_S.length - 1)];
        if (intentos > ESPERAS_S.length) {
          await fila.update({ estado: 'error', intentos, ultimo_error: `Se agotaron los reintentos: ${fallaTransitoria}` });
          resumen.errores += 1;
        } else {
          await fila.update({ intentos, ultimo_error: fallaTransitoria, proximo_intento: new Date(ahora.getTime() + espera * 1000) });
          resumen.reintentos += 1;
        }
        await bitacora(fila, 'error', fallaTransitoria, ms);
      }
    }
  } finally {
    enCurso = false;
  }
  return resumen;
}

// Dispara el envío sin bloquear la respuesta al huésped.
function enviarEnSegundoPlano() {
  setImmediate(() => {
    enviarPendientes().catch((e) => console.error('Error enviando reservas al channel manager:', e.message));
  });
}

module.exports = { encolar, enviarPendientes, enviarEnSegundoPlano, construirReservaXml, cargarReserva, envioConfigurado };
