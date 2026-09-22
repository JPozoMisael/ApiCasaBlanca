// Canal SiteMinder / Little Hotelier: la plataforma como un canal de venta (SiteConnect API).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { arrancar, proximoDia, sumar } = require('./helpers');
const { hoyISO } = require('../src/utils/dates');

const CLAVE = 'Str0ng!Passw0rd#1';
process.env.SITEMINDER_USER = 'siteminder-test';
process.env.SITEMINDER_PASSWORD = CLAVE;

let api;
let adminToken;
let hotel; // ficha pública
let codigoHotel;
let tipos; // { nombre → { id, codigo } }
const base = proximoDia(4, sumar(hoyISO(), 60));
const invitado = { nombres: 'Ana', apellidos: 'Pérez', email: 'ana.canal@example.com', telefono: '0991234567' };

/* ---------- SiteMinder simulado (entrante) ---------- */
const sobre = (cuerpo, usuario = process.env.SITEMINDER_USER, password = CLAVE) =>
  `<?xml version="1.0"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header>` +
  `<wsse:Security SOAP-ENV:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:UsernameToken>` +
  `<wsse:Username>${usuario}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>` +
  `</wsse:UsernameToken></wsse:Security></SOAP-ENV:Header><SOAP-ENV:Body>${cuerpo}</SOAP-ENV:Body></SOAP-ENV:Envelope>`;

const OTA = 'xmlns="http://www.opentravel.org/OTA/2003/05" EchoToken="ed8835ff-6198-4f38-b589-3058397f677c" TimeStamp="2026-01-01T00:00:00+00:00" Version="1.0"';

async function enviarSM(xml) {
  const res = await fetch(`${api.base}/channels/siteminder`, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8' }, body: xml });
  return { status: res.status, texto: await res.text() };
}
const ok = (t) => t.includes('<Success/>');
const errorDe = (t) => /<Error Type="(\d+)" Code="(\d+)">/.exec(t)?.slice(1, 3).join('/') ?? null;

const sac = (m, c = codigoHotel) => `<StatusApplicationControl Start="${m.desde}" End="${m.hasta ?? m.desde}" InvTypeCode="${m.inv}"${m.plan === null ? '' : ` RatePlanCode="${m.plan ?? 'BAR'}"`}/>`;

function disponibilidad(mensajes, hotelCode = codigoHotel) {
  const cuerpo = mensajes
    .map((m) => {
      const limite = m.limite !== undefined ? ` BookingLimit="${m.limite}"` : '';
      const cierre = m.cerrar !== undefined ? `<RestrictionStatus Status="${m.cerrar ? 'Close' : 'Open'}"/>` : '';
      const llegada = m.llegadaCerrada !== undefined ? `<RestrictionStatus Restriction="Arrival" Status="${m.llegadaCerrada ? 'Close' : 'Open'}"/>` : '';
      const min = m.minLos !== undefined ? `<LengthsOfStay><LengthOfStay MinMaxMessageType="SetMinLOS"${m.minLos ? ` Time="${m.minLos}"` : ''}/></LengthsOfStay>` : '';
      return `<AvailStatusMessage${limite}>${sac(m)}${cierre}${llegada}${min}</AvailStatusMessage>`;
    })
    .join('');
  return enviarSM(sobre(`<OTA_HotelAvailNotifRQ ${OTA}><AvailStatusMessages HotelCode="${hotelCode}">${cuerpo}</AvailStatusMessages></OTA_HotelAvailNotifRQ>`));
}

function tarifas(mensajes, hotelCode = codigoHotel) {
  const cuerpo = mensajes
    .map(
      (m) =>
        `<RateAmountMessage>${sac(m)}<Rates><Rate><BaseByGuestAmts><BaseByGuestAmt ${m.antes !== undefined ? `AmountBeforeTax="${m.antes}"` : `AmountAfterTax="${m.despues}"`} CurrencyCode="${m.moneda ?? 'USD'}" NumberOfGuests="2"/></BaseByGuestAmts></Rate></Rates></RateAmountMessage>`
    )
    .join('');
  return enviarSM(sobre(`<OTA_HotelRateAmountNotifRQ ${OTA}><RateAmountMessages HotelCode="${hotelCode}">${cuerpo}</RateAmountMessages></OTA_HotelRateAmountNotifRQ>`));
}

/* ---------- SiteMinder simulado (saliente: recibe nuestras reservas) ---------- */
const recibidos = [];
let respuestaMock = 'success';
let servidorMock;

const RS = (interior) =>
  `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header/><SOAP-ENV:Body><OTA_HotelResNotifRS xmlns="http://www.opentravel.org/OTA/2003/05" EchoToken="x" TimeStamp="2026-01-01T00:00:00+00:00" Version="1.0">${interior}</OTA_HotelResNotifRS></SOAP-ENV:Body></SOAP-ENV:Envelope>`;

async function esperar(condicion, ms = 4000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await condicion()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

before(async () => {
  api = await arrancar();
  adminToken = await api.login('admin.hotel-brisas-del-pacifico@salinasbooking.local', 'Demo12345!');
  hotel = (await api.request('GET', '/hotels/hotel-brisas-del-pacifico')).body.data;

  servidorMock = http.createServer((req, res) => {
    let cuerpo = '';
    req.on('data', (d) => (cuerpo += d));
    req.on('end', () => {
      recibidos.push(cuerpo);
      if (respuestaMock === 'caido') return res.writeHead(503).end('down');
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(respuestaMock === 'error' ? RS('<Errors><Error Type="12" Code="402">Room type code not found for this hotel</Error></Errors>') : RS('<Success/>'));
    });
  });
  await new Promise((r) => servidorMock.listen(0, '127.0.0.1', r));
});

after(async () => {
  await new Promise((r) => servidorMock.close(r));
  await api.cerrar();
});

const urlMock = () => `http://127.0.0.1:${servidorMock.address().port}/reservation-gateway/services`;
const configurarSalida = (url = urlMock()) => {
  process.env.SITEMINDER_RES_URL = url;
  process.env.SITEMINDER_OUT_USER = 'canal-usuario';
  process.env.SITEMINDER_OUT_PASSWORD = 'Canal!Passw0rd#22';
  process.env.SITEMINDER_CHANNEL_CODE = 'SALINASBOOKING';
};
const apagarSalida = () => ['SITEMINDER_RES_URL', 'SITEMINDER_OUT_USER', 'SITEMINDER_OUT_PASSWORD', 'SITEMINDER_CHANNEL_CODE'].forEach((k) => delete process.env[k]);

const disp = async (entrada, salida, adultos = 2) =>
  (await api.request('GET', `/hotels/hotel-brisas-del-pacifico/availability?checkIn=${entrada}&checkOut=${salida}&adultos=${adultos}`)).body.data.habitaciones;
const de = async (nombre, entrada, salida) => (await disp(entrada, salida)).find((h) => h.nombre === nombre);

const reservar = (tipoId, entrada, salida, extra = {}) =>
  api.request('POST', '/bookings', {
    body: { hotel_id: hotel.id, fecha_entrada: entrada, fecha_salida: salida, adultos: 2, habitaciones: [{ tipo_habitacion_id: tipoId }], contacto: invitado, ...extra },
  });

/* ======================================================
   CONEXIÓN Y AUTENTICACIÓN
====================================================== */
test('el hotel crea su conexión y obtiene el HotelCode para dárselo a SiteMinder', async () => {
  const sin = await api.request('GET', '/channels/connection', { token: adminToken });
  assert.equal(sin.body.data, null);
  assert.equal(sin.body.config.entrada_configurada, true);

  const r = await api.request('POST', '/channels/connection', { token: adminToken, body: {} });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  codigoHotel = r.body.data.codigo_hotel;
  assert.match(codigoHotel, /^SB\d{5}$/);
  assert.equal(r.body.data.estado, 'pendiente');
  assert.equal(r.body.data.mapeos.length, hotel.tiposHabitacion.length);

  tipos = Object.fromEntries(r.body.data.mapeos.map((m) => [m.tipoHabitacion.nombre, { id: m.tipo_habitacion_id, codigo: m.codigo_habitacion, mapeoId: m.id }]));
  assert.equal((await api.request('POST', '/channels/connection', { token: adminToken, body: {} })).status, 409);
});

test('autenticación WS-Security: sin credenciales o con contraseña errónea → Error 4/448', async () => {
  const rq = `<OTA_HotelAvailRQ ${OTA} AvailRatesOnly="true"><AvailRequestSegments><AvailRequestSegment AvailReqType="Room"><HotelSearchCriteria><Criterion><HotelRef HotelCode="${codigoHotel}"/></Criterion></HotelSearchCriteria></AvailRequestSegment></AvailRequestSegments></OTA_HotelAvailRQ>`;
  for (const [u, p] of [['siteminder-test', 'incorrecta'], ['otro', CLAVE], ['', '']]) {
    const r = await enviarSM(sobre(rq, u, p));
    assert.equal(r.status, 200);
    assert.equal(errorDe(r.texto), '4/448');
    assert.ok(r.texto.includes('OTA_HotelAvailRS'));
  }
  // Solo SOAP
  assert.equal((await enviarSM('esto no es xml')).status, 400);
  assert.equal((await enviarSM('<html/>')).status, 400);
});

test('OTA_HotelAvailRQ devuelve habitaciones y tarifa; hotel desconocido → 6/392', async () => {
  const rq = (code) => sobre(`<OTA_HotelAvailRQ ${OTA} AvailRatesOnly="true"><AvailRequestSegments><AvailRequestSegment AvailReqType="Room"><HotelSearchCriteria><Criterion><HotelRef HotelCode="${code}"/></Criterion></HotelSearchCriteria></AvailRequestSegment></AvailRequestSegments></OTA_HotelAvailRQ>`);
  const r = await enviarSM(rq(codigoHotel));
  assert.ok(ok(r.texto), r.texto);
  assert.ok(r.texto.includes('EchoToken="ed8835ff-6198-4f38-b589-3058397f677c"')); // se devuelve el mismo EchoToken
  assert.equal((r.texto.match(/<RoomStay>/g) || []).length, hotel.tiposHabitacion.length);
  for (const t of Object.values(tipos)) assert.ok(r.texto.includes(`RoomTypeCode="${t.codigo}"`));
  assert.ok(r.texto.includes('RatePlanCode="BAR"'));
  assert.ok(r.texto.includes('MaxOccupancy="'));

  assert.equal(errorDe((await enviarSM(rq('NOEXISTE'))).texto), '6/392');
});

/* ======================================================
   DISPONIBILIDAD, TARIFAS Y RESTRICCIONES
====================================================== */
test('mientras la conexión está pendiente se vende con el inventario propio', async () => {
  const antes = await de('Estándar Doble', base, sumar(base, 2));
  assert.equal(antes.disponibles, 8);
  assert.equal(antes.reservable, true);
});

test('los tipos mapeados sin datos del channel manager no se venden; con ARI queda activa', async () => {
  const D = sumar(base, 10);
  // Primer envío: solo Estándar Doble
  let r = await disponibilidad([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 4), limite: 3 }]);
  assert.ok(ok(r.texto), r.texto);
  r = await tarifas([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 4), antes: 80 }]);
  assert.ok(ok(r.texto), r.texto);

  const conexion = (await api.request('GET', '/channels/connection', { token: adminToken })).body.data;
  assert.equal(conexion.estado, 'activa');
  assert.ok(conexion.ultima_entrada_en);
  assert.ok(conexion.resumen.fechas_cargadas >= 5);

  const estandar = await de('Estándar Doble', D, sumar(D, 3));
  assert.equal(estandar.disponibles, 3); // min(3 de SiteMinder, 8 locales)
  assert.equal(estandar.precio_total, 240); // 3 noches × 80 (tarifa de SiteMinder, no la local)

  // Otro tipo mapeado sin datos → no se vende
  const superior = await de('Superior con Balcón', D, sumar(D, 3));
  assert.equal(superior.reservable, false);

  // Fuera del rango cargado → tampoco
  assert.equal((await de('Estándar Doble', sumar(D, 5), sumar(D, 7))).reservable, false);
  // Estancia que cruza el último día cargado
  assert.equal((await de('Estándar Doble', sumar(D, 3), sumar(D, 6))).reservable, false);

  // El buscador global respeta lo mismo
  const q = await api.request('GET', `/search/hoteles?zona=salinas-centro&checkIn=${D}&checkOut=${sumar(D, 3)}&adultos=2`);
  const h = q.body.data.find((x) => x.slug === 'hotel-brisas-del-pacifico');
  assert.equal(h.precio_noche, 80);
  assert.equal(h.tipo_sugerido.nombre, 'Estándar Doble');
});

test('la tarifa con impuestos incluidos se convierte a precio sin impuestos (IVA 15 %)', async () => {
  const D = sumar(base, 20);
  await disponibilidad([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 1), limite: 2 }]);
  await tarifas([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 1), despues: 115 }]);
  const e = await de('Estándar Doble', D, sumar(D, 2));
  assert.equal(e.precio_total, 200); // 2 × (115 / 1.15)
});

test('venta local: el cupo baja al reservar y se restablece con el siguiente envío del channel manager', async () => {
  const D = sumar(base, 30);
  await disponibilidad([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 1), limite: 2 }]);
  await tarifas([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 1), antes: 90 }]);

  const id = tipos['Estándar Doble'].id;
  assert.equal((await reservar(id, D, sumar(D, 2))).status, 201);
  assert.equal((await de('Estándar Doble', D, sumar(D, 2))).disponibles, 1);
  assert.equal((await reservar(id, D, sumar(D, 2), { contacto: { ...invitado, email: 'otro1@example.com' } })).status, 201);

  // Agotado según SiteMinder aunque el hotel tenga más habitaciones registradas aquí
  const tercera = await reservar(id, D, sumar(D, 2), { contacto: { ...invitado, email: 'otro2@example.com' } });
  assert.equal(tercera.status, 409);
  assert.equal(tercera.body.code, 'SIN_DISPONIBILIDAD');

  // SiteMinder recalcula (descontó nuestras 2 ventas de 5 que tenía) y avisa: 3 disponibles → se reinicia el descuento local
  await disponibilidad([{ inv: tipos['Estándar Doble'].codigo, desde: D, hasta: sumar(D, 1), limite: 3 }]);
  assert.equal((await de('Estándar Doble', D, sumar(D, 2))).disponibles, 3);
});

test('stop sell, llegada cerrada y estancia mínima', async () => {
  const D = sumar(base, 40);
  const inv = tipos['Estándar Doble'].codigo;
  const id = 'Estándar Doble';
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 5), limite: 4 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 5), antes: 70 }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, true);

  // Stop sell de una noche intermedia bloquea las estancias que la incluyen
  await disponibilidad([{ inv, desde: sumar(D, 1), cerrar: true }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, false);
  assert.equal((await de(id, sumar(D, 2), sumar(D, 4))).reservable, true);
  // Open lo restaura
  await disponibilidad([{ inv, desde: sumar(D, 1), cerrar: false }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, true);

  // Llegada cerrada
  await disponibilidad([{ inv, desde: D, llegadaCerrada: true }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, false);
  assert.equal((await de(id, sumar(D, 1), sumar(D, 3))).reservable, true);
  await disponibilidad([{ inv, desde: D, llegadaCerrada: false }]);

  // Estancia mínima de 3 noches para llegadas ese día; sin Time se elimina
  await disponibilidad([{ inv, desde: D, minLos: 3 }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, false);
  assert.equal((await de(id, D, sumar(D, 3))).reservable, true);
  await disponibilidad([{ inv, desde: D, minLos: 0 }]);
  assert.equal((await de(id, D, sumar(D, 2))).reservable, true);
});

test('validación atómica: un código de habitación o de tarifa desconocido no aplica nada', async () => {
  const D = sumar(base, 50);
  const inv = tipos['Estándar Doble'].codigo;

  let r = await disponibilidad([{ inv, desde: D, limite: 5 }, { inv: 'INVENTADO', desde: D, limite: 1 }]);
  assert.equal(errorDe(r.texto), '12/402');
  assert.equal((await de('Estándar Doble', D, sumar(D, 1))).reservable, false); // el mensaje válido tampoco se aplicó

  r = await disponibilidad([{ inv, desde: D, limite: 5, plan: 'OTRO' }]);
  assert.equal(errorDe(r.texto), '12/249');

  r = await disponibilidad([{ inv, desde: D, hasta: sumar(D, -3), limite: 5 }]);
  assert.ok(errorDe(r.texto)); // rango invertido
  r = await disponibilidad([{ inv, desde: 'no-es-fecha', limite: 5 }]);
  assert.ok(errorDe(r.texto));
  r = await disponibilidad([{ inv, desde: D, limite: -1 }]);
  assert.ok(errorDe(r.texto));

  r = await tarifas([{ inv, desde: D, antes: 80, moneda: 'EUR' }]);
  assert.equal(errorDe(r.texto), '3/450'); // solo USD
  assert.ok(errorDe((await disponibilidad([{ inv, desde: D, limite: 1 }], 'SB99999')).texto), '6/392');

  // La bitácora registra los errores
  const log = (await api.request('GET', '/channels/messages', { token: adminToken })).body.data;
  assert.ok(log.some((m) => m.resultado === 'error' && m.direccion === 'entrada'));
  assert.ok(log.some((m) => m.resultado === 'ok'));
});

test('pausar la conexión detiene la venta de los tipos mapeados; reactivarla la restablece', async () => {
  const D = sumar(base, 60);
  const inv = tipos['Estándar Doble'].codigo;
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 3), limite: 2 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 3), antes: 75 }]);
  assert.equal((await de('Estándar Doble', D, sumar(D, 2))).reservable, true);

  assert.equal((await api.request('PUT', '/channels/connection', { token: adminToken, body: { estado: 'pausada' } })).status, 200);
  assert.equal((await de('Estándar Doble', D, sumar(D, 2))).reservable, false);
  assert.equal((await reservar(tipos['Estándar Doble'].id, D, sumar(D, 2))).status, 409);

  assert.equal((await api.request('PUT', '/channels/connection', { token: adminToken, body: { estado: 'activa' } })).status, 200);
  assert.equal((await de('Estándar Doble', D, sumar(D, 2))).reservable, true);
});

/* ======================================================
   RESERVAS HACIA SITEMINDER
====================================================== */
async function estadoSalida(reservaId, accion) {
  const { models } = require('../src/models');
  return models.CanalSalida.findOne({ where: { reserva_id: reservaId, accion } });
}

test('una reserva se envía a SiteMinder como Commit con el formato de la especificación', async () => {
  const D = sumar(base, 70);
  const inv = tipos['Estándar Doble'].codigo;
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 3), limite: 5 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 3), antes: 100 }]);

  respuestaMock = 'success';
  recibidos.length = 0;
  configurarSalida();

  const r = await reservar(tipos['Estándar Doble'].id, D, sumar(D, 2), { contacto: { ...invitado, email: 'commit@example.com', nacionalidad: 'Ecuador' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const reservaId = r.body.data.id;

  assert.ok(await esperar(async () => (await estadoSalida(reservaId, 'Commit'))?.estado === 'enviado'), 'el Commit debía enviarse');
  const idAlfa = r.body.data.codigo_reserva.replace(/-/g, '');
  const propios = () => recibidos.filter((x) => x.includes(`ID="${idAlfa}"`));
  assert.equal(propios().length, 1); // llegan también las reservas pendientes de pruebas anteriores, pero esta una sola vez
  const xml = propios()[0];

  assert.ok(xml.includes('<wsse:Username>canal-usuario</wsse:Username>')); // WS-Security
  assert.ok(xml.includes('ResStatus="Commit"'));
  assert.ok(xml.includes('<RequestorID Type="22" ID="SALINASBOOKING"/>'));
  assert.ok(xml.includes(`HotelCode="${codigoHotel}"`));
  assert.ok(xml.includes(`RoomTypeCode="${tipos['Estándar Doble'].codigo}"`));
  assert.ok(xml.includes('RatePlanCode="BAR"'));
  assert.ok(xml.includes(`<TimeSpan Start="${D}" End="${sumar(D, 2)}"/>`));
  assert.ok(xml.includes('<GuestCount AgeQualifyingCode="10" Count="2"/>'));
  assert.ok(xml.includes('<Email>commit@example.com</Email>'));
  assert.ok(xml.includes('<CountryName>Ecuador</CountryName>'));
  // El identificador solo lleva caracteres alfanuméricos
  const id = /<UniqueID Type="14" ID="([^"]+)"/.exec(xml)[1];
  assert.match(id, /^[A-Za-z0-9]+$/);
  assert.equal(id, r.body.data.codigo_reserva.replace(/-/g, ''));
  // 2 noches × 100 sin impuestos; con IVA 15 % = 230
  assert.equal((xml.match(/<Rate UnitMultiplier="1"/g) || []).length, 2);
  assert.ok(xml.includes('AmountBeforeTax="200.00" AmountAfterTax="230.00"'));
  // Tiempo de fechas en ISO 8601
  assert.match(/CreateDateTime="([^"]+)"/.exec(xml)[1], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/);

  // Cancelación: se envía un Cancel con LastModifyDateTime y el cupo local se libera
  recibidos.length = 0;
  const c = await api.request('POST', '/bookings/lookup/cancelar', { body: { codigo: r.body.data.codigo_reserva, email: 'commit@example.com', motivo: 'Cambio de planes' } });
  assert.equal(c.status, 200);
  assert.ok(await esperar(async () => (await estadoSalida(reservaId, 'Cancel'))?.estado === 'enviado'), 'el Cancel debía enviarse');
  const cancel = propios()[0];
  assert.ok(cancel.includes('ResStatus="Cancel"'));
  assert.ok(cancel.includes('LastModifyDateTime='));
  assert.ok(cancel.includes('Cambio de planes'));
  assert.ok(cancel.includes('AmountBeforeTax="0.00" AmountAfterTax="0.00"'));
  apagarSalida();
});

test('cancelar antes de que el Commit se envíe: no se envía nada a SiteMinder', async () => {
  const { models } = require('../src/models');
  const D = sumar(base, 80);
  const inv = tipos['Estándar Doble'].codigo;
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 3), limite: 5 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 3), antes: 100 }]);

  apagarSalida(); // envío no configurado → el Commit queda pendiente en la cola
  recibidos.length = 0;
  const r = await reservar(tipos['Estándar Doble'].id, D, sumar(D, 1), { contacto: { ...invitado, email: 'omitir@example.com' } });
  assert.equal(r.status, 201);
  assert.equal((await estadoSalida(r.body.data.id, 'Commit')).estado, 'pendiente');

  await api.request('POST', '/bookings/lookup/cancelar', { body: { codigo: r.body.data.codigo_reserva, email: 'omitir@example.com' } });
  assert.equal((await estadoSalida(r.body.data.id, 'Commit')).estado, 'omitido');
  assert.equal(await estadoSalida(r.body.data.id, 'Cancel'), null);

  configurarSalida();
  const { enviarPendientes } = require('../src/integrations/siteminder/salida.service');
  await enviarPendientes();
  assert.equal(recibidos.filter((x) => x.includes(r.body.data.codigo_reserva.replace(/-/g, ''))).length, 0);
  assert.equal(await models.CanalSalida.count({ where: { estado: 'pendiente', reserva_id: r.body.data.id } }), 0);
  apagarSalida();
});

test('si SiteMinder responde con <Errors> no se reintenta; el hotel puede reintentar a mano', async () => {
  const D = sumar(base, 90);
  const inv = tipos['Estándar Doble'].codigo;
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 3), limite: 5 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 3), antes: 100 }]);

  respuestaMock = 'error';
  recibidos.length = 0;
  configurarSalida();
  const r = await reservar(tipos['Estándar Doble'].id, D, sumar(D, 1), { contacto: { ...invitado, email: 'error@example.com' } });
  assert.ok(await esperar(async () => (await estadoSalida(r.body.data.id, 'Commit'))?.estado === 'error'));
  const fila = await estadoSalida(r.body.data.id, 'Commit');
  assert.match(fila.ultimo_error, /402/);
  assert.equal(fila.intentos, 1);

  const { enviarPendientes } = require('../src/integrations/siteminder/salida.service');
  const antes = recibidos.filter((x) => x.includes(r.body.data.codigo_reserva.replace(/-/g, ''))).length;
  await enviarPendientes();
  assert.equal(antes, 1);
  assert.equal(recibidos.filter((x) => x.includes(r.body.data.codigo_reserva.replace(/-/g, ''))).length, 1); // no hubo un segundo intento

  const conexion = (await api.request('GET', '/channels/connection', { token: adminToken })).body.data;
  assert.match(conexion.ultimo_error, /402/);
  assert.ok(conexion.resumen.salidas_con_error >= 1);

  // Reintento manual → ahora sí lo acepta
  respuestaMock = 'success';
  const reint = await api.request('POST', `/channels/outbox/${fila.id}/retry`, { token: adminToken });
  assert.equal(reint.status, 200);
  assert.ok(await esperar(async () => (await estadoSalida(r.body.data.id, 'Commit'))?.estado === 'enviado'));
  // Solo se reintentan los que tienen error
  assert.equal((await api.request('POST', `/channels/outbox/${fila.id}/retry`, { token: adminToken })).status, 409);
  apagarSalida();
});

test('si SiteMinder no responde (caído / 5xx) se reintenta con espera creciente', async () => {
  const D = sumar(base, 100);
  const inv = tipos['Estándar Doble'].codigo;
  await disponibilidad([{ inv, desde: D, hasta: sumar(D, 3), limite: 5 }]);
  await tarifas([{ inv, desde: D, hasta: sumar(D, 3), antes: 100 }]);

  respuestaMock = 'caido';
  configurarSalida();
  const r = await reservar(tipos['Estándar Doble'].id, D, sumar(D, 1), { contacto: { ...invitado, email: 'caido@example.com' } });
  assert.ok(await esperar(async () => (await estadoSalida(r.body.data.id, 'Commit'))?.intentos === 1));
  let fila = await estadoSalida(r.body.data.id, 'Commit');
  assert.equal(fila.estado, 'pendiente');
  assert.ok(new Date(fila.proximo_intento).getTime() > Date.now() + 20 * 1000); // ≥ 30 s de espera

  // Al llegar la hora del reintento y volver el servicio, se entrega
  respuestaMock = 'success';
  const { enviarPendientes } = require('../src/integrations/siteminder/salida.service');
  const res = await enviarPendientes({ ahora: new Date(Date.now() + 60 * 1000) });
  assert.equal(res.enviados, 1);
  fila = await estadoSalida(r.body.data.id, 'Commit');
  assert.equal(fila.estado, 'enviado');

  // Sin conexión de red también se reintenta
  respuestaMock = 'success';
  configurarSalida('http://127.0.0.1:9/nada');
  const r2 = await reservar(tipos['Estándar Doble'].id, sumar(D, 1), sumar(D, 2), { contacto: { ...invitado, email: 'sinred@example.com' } });
  assert.equal(r2.status, 201);
  assert.ok(await esperar(async () => (await estadoSalida(r2.body.data.id, 'Commit'))?.intentos === 1));
  assert.equal((await estadoSalida(r2.body.data.id, 'Commit')).estado, 'pendiente');
  apagarSalida();
});

/* ======================================================
   ACCESO Y ALCANCE
====================================================== */
test('solo quien tiene el permiso ve y administra la conexión; cada hotel solo la suya', async () => {
  // recepción no tiene 'canales.gestionar'
  const crear = await api.request('POST', '/admin/usuarios', { token: adminToken, body: { nombre: 'Rita', apellido: 'Recep', email: 'rita@brisas.com', password: 'Clave12345', rol: 'recepcion' } });
  assert.equal(crear.status, 201);
  const recepcion = await api.login('rita@brisas.com', 'Clave12345');
  assert.equal((await api.request('GET', '/channels/connection', { token: recepcion })).status, 403);
  assert.equal((await api.request('GET', '/channels/messages', { token: recepcion })).status, 403);

  // el admin de otro hotel no ve la conexión de este
  const otro = await api.login('admin.casa-blanca@salinasbooking.local', 'Demo12345!');
  assert.equal((await api.request('GET', '/channels/connection', { token: otro })).body.data, null);
  assert.equal((await api.request('GET', '/channels/outbox', { token: otro })).body.data.length, 0);
  assert.equal((await api.request('PUT', `/channels/mappings/${tipos['Estándar Doble'].mapeoId}`, { token: otro, body: { codigo: 'HACK' } })).status, 404);

  // el menú del administrador incluye la opción "Canales de venta"
  const menu = (await api.request('GET', '/auth/menu', { token: adminToken })).body.data.menu;
  assert.ok(menu.some((m) => m.clave === 'canales' && m.ruta === '/admin/canales'));
  const menuRecep = (await api.request('GET', '/auth/menu', { token: recepcion })).body.data.menu;
  assert.ok(!menuRecep.some((m) => m.clave === 'canales'));
});

test('editar el código de un mapeo cambia el InvTypeCode que se espera', async () => {
  const m = tipos['Estándar Doble'];
  const r = await api.request('PUT', `/channels/mappings/${m.mapeoId}`, { token: adminToken, body: { codigo: 'STD-DBL' } });
  assert.equal(r.status, 200);
  assert.equal(errorDe((await disponibilidad([{ inv: m.codigo, desde: sumar(base, 5), limite: 1 }])).texto), '12/402'); // el código viejo ya no existe
  assert.ok(ok((await disponibilidad([{ inv: 'STD-DBL', desde: sumar(base, 5), limite: 1 }])).texto));
  assert.equal((await api.request('PUT', `/channels/mappings/${m.mapeoId}`, { token: adminToken, body: { codigo: 'código inválido!' } })).status, 422);
});
