// Regresiones de la revisión de seguridad: aislamiento entre hoteles, doble venta y abuso.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, proximoDia, sumar } = require('./helpers');
const { hoyISO } = require('../src/utils/dates');

let api;
const invitado = { nombres: 'Ana', apellidos: 'Pérez', email: 'ana@example.com', telefono: '0991234567' };
const entrada = proximoDia(4, sumar(hoyISO(), 30));

before(async () => {
  api = await arrancar();
});
after(async () => {
  await api.cerrar();
});

const hotel = async (slug) => (await api.request('GET', `/hotels/${slug}`)).body.data;
const admin = (slug) => api.login(`admin.${slug}@salinasbooking.local`, 'Demo12345!');

test('/payments ignora parámetros de query que intenten salir del hotel', async () => {
  const hB = await hotel('hotel-brisas-del-pacifico');
  const tokenB = await admin('hotel-brisas-del-pacifico');
  const lejos = sumar(entrada, 10);
  const r = await api.request('POST', '/bookings', {
    body: { hotel_id: hB.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: hB.tiposHabitacion[0].id }], contacto: invitado },
  });
  await api.request('POST', '/payments', { token: tokenB, body: { reserva_id: r.body.data.id, monto: 10, metodo: 'efectivo' } });
  assert.equal((await api.request('GET', '/payments', { token: tokenB })).body.data.length, 1);

  const tokenA = await admin('casa-blanca');
  for (const q of ['?hotelId=', '?hotelId=0', `?hotelId=${hB.id}`, '?hotel_id=', `?hotel_id=${hB.id}`]) {
    const res = await api.request('GET', `/payments${q}`, { token: tokenA });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 0, `fuga de pagos con ${q}`);
  }
});

test('el personal solo reutiliza huéspedes de su hotel; los invitados nunca reutilizan el registro de otro', async () => {
  const hA = await hotel('casa-blanca');
  const hB = await hotel('hotel-brisas-del-pacifico');
  const tokenA = await admin('casa-blanca');
  const lejos = sumar(entrada, 20);

  const base = { hotel_id: hB.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 1, habitaciones: [{ tipo_habitacion_id: hB.tiposHabitacion[0].id }] };
  const email = 'victima@example.com';
  const a = await api.request('POST', '/bookings', { body: { ...base, contacto: { nombres: 'Víctima', apellidos: 'Real', email, telefono: '0991110000' } } });
  const b = await api.request('POST', '/bookings', { body: { ...base, contacto: { nombres: 'Atacante', apellidos: 'X', email, telefono: '0999999999' } } });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.notEqual(a.body.data.cliente_id, b.body.data.cliente_id);
  assert.equal(b.body.data.cliente.telefono, '0999999999'); // no se filtran los datos de la víctima

  // El personal de otro hotel no puede colgar reservas de un cliente que nunca estuvo en su hotel
  const r = await api.request('POST', '/bookings', {
    token: tokenA,
    body: { hotel_id: hA.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: hA.tiposHabitacion[0].id }], cliente_id: a.body.data.cliente_id },
  });
  assert.equal(r.status, 404);
});

test('una reserva pendiente vencida cuyo cupo fue tomado no se puede confirmar ni cobrar', async () => {
  const { models } = require('../src/models');
  const h = await hotel('hotel-anconcito-bay');
  const tokenAdmin = await admin('hotel-anconcito-bay');
  const doble = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Doble'); // 6 unidades
  const lejos = sumar(entrada, 30);
  const pedir = (cantidad, pagoEnHotel) => api.request('POST', '/bookings', {
    body: { hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2 * cantidad,
      habitaciones: [{ tipo_habitacion_id: doble.id, cantidad }], contacto: { ...invitado, email: `p${cantidad}${pagoEnHotel}@example.com` }, pago_en_hotel: pagoEnHotel },
  });

  const pend = await pedir(6, false); // retiene las 6
  assert.equal(pend.status, 201);
  await models.Reserva.update({ expira_en: new Date(Date.now() - 1000) }, { where: { id: pend.body.data.id } });
  assert.equal((await pedir(1, true)).status, 201); // otro huésped toma una

  const conf = await api.request('PATCH', `/bookings/${pend.body.data.id}/confirmar`, { token: tokenAdmin });
  assert.equal(conf.status, 409);
  assert.equal(conf.body.code, 'SIN_DISPONIBILIDAD');
  const pago = await api.request('POST', '/payments', { token: tokenAdmin, body: { reserva_id: pend.body.data.id, monto: 10, metodo: 'efectivo' } });
  assert.equal(pago.status, 409);
});

test('un abono parcial detiene la expiración; confirmar a tiempo sí funciona', async () => {
  const { models } = require('../src/models');
  const { expirarReservasPendientes } = require('../src/services/reservas.service');
  const h = await hotel('hostal-las-palmeras-beach');
  const tokenAdmin = await admin('hostal-las-palmeras-beach');
  const lejos = sumar(entrada, 40);
  const r = await api.request('POST', '/bookings', {
    body: { hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 2), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: h.tiposHabitacion[1].id }], contacto: { ...invitado, email: 'abono@example.com' }, pago_en_hotel: false },
  });
  assert.equal(r.status, 201);
  const p = await api.request('POST', '/payments', { token: tokenAdmin, body: { reserva_id: r.body.data.id, monto: 10, metodo: 'transferencia', referencia: 'REF-1' } });
  assert.equal(p.status, 201);
  assert.equal((await models.Reserva.findByPk(r.body.data.id)).expira_en, null);
  await expirarReservasPendientes(new Date(Date.now() + 24 * 3600 * 1000));
  assert.equal((await models.Reserva.findByPk(r.body.data.id)).estado, 'pendiente');

  const conf = await api.request('PATCH', `/bookings/${r.body.data.id}/confirmar`, { token: tokenAdmin });
  assert.equal(conf.status, 200);
  assert.equal(conf.body.data.estado, 'confirmada');
});

test('la referencia de pago repetida en otro hotel no choca', async () => {
  const mk = async (slug, email, dias) => {
    const h = await hotel(slug);
    const lejos = sumar(entrada, dias);
    const r = await api.request('POST', '/bookings', {
      body: { hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
        habitaciones: [{ tipo_habitacion_id: h.tiposHabitacion[0].id }], contacto: { ...invitado, email } },
    });
    return api.request('POST', '/payments', { token: await admin(slug), body: { reserva_id: r.body.data.id, monto: 10, metodo: 'transferencia', referencia: 'TRANSF-999' } });
  };
  assert.equal((await mk('cabanas-mar-bravo', 'r1@example.com', 50)).status, 201);
  assert.equal((await mk('hotel-anconcito-bay', 'r2@example.com', 50)).status, 201);
});

test('tope de reservas web activas por huésped', async () => {
  const C = require('../src/config/constants');
  const previo = C.MAX_RESERVAS_ACTIVAS_WEB;
  C.MAX_RESERVAS_ACTIVAS_WEB = 2;
  try {
    const h = await hotel('hotel-brisas-del-pacifico');
    const pedir = (i) => api.request('POST', '/bookings', {
      body: { hotel_id: h.id, fecha_entrada: sumar(entrada, 60 + i * 3), fecha_salida: sumar(entrada, 61 + i * 3), adultos: 1,
        habitaciones: [{ tipo_habitacion_id: h.tiposHabitacion[0].id }], contacto: { ...invitado, email: 'acaparador@example.com' } },
    });
    assert.equal((await pedir(0)).status, 201);
    assert.equal((await pedir(1)).status, 201);
    const r = await pedir(2);
    assert.equal(r.status, 429);
    assert.equal(r.body.code, 'LIMITE_RESERVAS');
  } finally {
    C.MAX_RESERVAS_ACTIVAS_WEB = previo;
  }
});

test('un admin de hotel no puede desactivar a otro admin; reportes con rango enorme → 400', async () => {
  const { models } = require('../src/models');
  const superToken = await api.login('admin@salinasbooking.local', 'SuperAdmin123!');
  const tokenA = await admin('casa-blanca');
  const hA = await hotel('casa-blanca');
  const otro = await api.request('POST', '/admin/usuarios', {
    token: superToken,
    body: { nombre: 'Otro', apellido: 'Admin', email: 'otro.admin@cb.com', password: 'Clave12345', rol: 'admin', hotel_id: hA.id },
  });
  assert.equal(otro.status, 201, JSON.stringify(otro.body));

  const r = await api.request('PATCH', `/admin/usuarios/${otro.body.data.id}/estado`, { token: tokenA, body: { estado: 'inactivo' } });
  assert.equal(r.status, 403);
  assert.equal((await models.User.findByPk(otro.body.data.id)).estado, 'activo');

  assert.equal((await api.request('GET', '/reports/ocupacion?desde=2020-01-01&hasta=2026-01-01', { token: tokenA })).status, 400);
  assert.equal((await api.request('GET', '/reports/ingresos?desde=2020-01-01&hasta=2026-01-01', { token: tokenA })).status, 400);
});
