// Operación de recepción: reservas por teléfono / mostrador y calendario de ocupación.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, proximoDia, sumar } = require('./helpers');
const { hoyISO } = require('../src/utils/dates');

let api;
let adminToken;
let recepcion;
let limpieza;
let hotel;
const hoy = hoyISO();
const desde = proximoDia(1, sumar(hoy, 20)); // un lunes

before(async () => {
  api = await arrancar();
  adminToken = await api.login('admin.casa-blanca@salinasbooking.local', 'Demo12345!');
  hotel = (await api.request('GET', '/hotels/casa-blanca')).body.data;
  for (const rol of ['recepcion', 'limpieza']) {
    const r = await api.request('POST', '/admin/usuarios', {
      token: adminToken,
      body: { nombre: 'Persona', apellido: rol, email: `${rol}@op.com`, password: 'Clave12345', rol },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  }
  recepcion = await api.login('recepcion@op.com', 'Clave12345');
  limpieza = await api.login('limpieza@op.com', 'Clave12345');
});
after(async () => {
  await api.cerrar();
});

const cuerpo = (extra = {}) => ({
  hotel_id: hotel.id,
  fecha_entrada: desde,
  fecha_salida: sumar(desde, 2),
  adultos: 2,
  habitaciones: [{ tipo_habitacion_id: hotel.tiposHabitacion[0].id }],
  ...extra,
});

test('recepción registra una reserva por teléfono sin correo del huésped', async () => {
  const r = await api.request('POST', '/bookings', {
    token: recepcion,
    body: cuerpo({ canal: 'telefono', contacto: { nombres: 'Rosa', apellidos: 'Mendoza', telefono: '0987654321' }, observaciones: 'Llega en bus a las 15:00' }),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.canal, 'telefono');
  assert.equal(r.body.data.estado, 'confirmada');
  assert.equal(r.body.data.cliente.email, null);
  assert.equal(r.body.data.cliente.telefono, '0987654321');
  assert.equal(r.body.data.observaciones, 'Llega en bus a las 15:00');

  // Sin ningún medio de contacto → error claro
  const sin = await api.request('POST', '/bookings', { token: recepcion, body: cuerpo({ contacto: { nombres: 'Solo', apellidos: 'Nombre' } }) });
  assert.equal(sin.status, 400);
  assert.equal(sin.body.code, 'CONTACTO_INCOMPLETO');

  // Con solo correo también sirve
  const conCorreo = await api.request('POST', '/bookings', {
    token: recepcion,
    body: cuerpo({ contacto: { nombres: 'Luis', apellidos: 'Vera', email: 'luis.vera@example.com' }, canal: 'whatsapp' }),
  });
  assert.equal(conCorreo.status, 201, JSON.stringify(conCorreo.body));

  // Para el sitio web sigue siendo obligatorio el contacto completo
  const web = await api.request('POST', '/bookings', { body: cuerpo({ contacto: { nombres: 'Web', apellidos: 'Guest', telefono: '0987654321' } }) });
  assert.equal(web.status, 400);
  assert.equal(web.body.code, 'CONTACTO_INCOMPLETO');
});

test('recepción puede reservar una habitación concreta y dejarla pendiente', async () => {
  const habs = (await api.request('GET', `/rooms?tipo_habitacion_id=${hotel.tiposHabitacion[1].id}`, { token: recepcion })).body.data;
  const r = await api.request('POST', '/bookings', {
    token: recepcion,
    body: cuerpo({
      habitaciones: [{ habitacion_id: habs[2].id }],
      estado_inicial: 'pendiente',
      contacto: { nombres: 'Pedro', apellidos: 'Loor', telefono: '0999000111' },
    }),
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.estado, 'pendiente');
  assert.equal(r.body.data.detalles[0].habitacion.id, habs[2].id);
});

test('el calendario muestra habitaciones, reservas por habitación y bloqueos', async () => {
  const habs = (await api.request('GET', '/rooms', { token: adminToken })).body.data;
  const libre = habs.find((h) => h.tipo_habitacion_id === hotel.tiposHabitacion[2].id);

  // bloqueo por mantenimiento en una habitación
  const b = await api.request('POST', '/bloqueos', {
    token: adminToken,
    body: { habitacion_id: libre.id, fecha_inicio: sumar(desde, 1), fecha_fin: sumar(desde, 3), tipo_bloqueo: 'mantenimiento', motivo: 'Pintura' },
  });
  assert.equal(b.status, 201, JSON.stringify(b.body));

  const r = await api.request('GET', `/calendar?desde=${desde}&dias=14`, { token: recepcion });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const c = r.body.data;
  assert.equal(c.desde, desde);
  assert.equal(c.hasta, sumar(desde, 14));
  assert.equal(c.habitaciones.length, habs.length);
  assert.ok(c.habitaciones.every((h) => h.tipoHabitacion?.nombre));

  // 3 reservas activas creadas en los tests anteriores, cada una con su habitación
  assert.equal(c.reservas.length, 3);
  const porTelefono = c.reservas.find((x) => x.canal === 'telefono');
  assert.equal(porTelefono.huesped, 'Rosa Mendoza');
  assert.equal(porTelefono.habitaciones.length, 1);
  assert.ok(c.habitaciones.some((h) => h.id === porTelefono.habitaciones[0]));
  assert.ok(c.reservas.some((x) => x.estado === 'pendiente'));

  assert.equal(c.bloqueos.length, 1);
  assert.equal(c.bloqueos[0].habitacion_id, libre.id);
  assert.equal(c.bloqueos[0].motivo, 'Pintura');
});

test('el calendario excluye canceladas y respeta la ventana pedida', async () => {
  const lista = (await api.request('GET', '/bookings?estado=confirmada', { token: recepcion })).body.data;
  const aCancelar = lista.find((x) => x.canal === 'whatsapp');
  await api.request('PATCH', `/bookings/${aCancelar.id}/cancelar`, { token: recepcion, body: {} });

  let c = (await api.request('GET', `/calendar?desde=${desde}&dias=7`, { token: recepcion })).body.data;
  assert.ok(!c.reservas.some((x) => x.id === aCancelar.id));
  assert.equal(c.reservas.length, 2);

  // ventana posterior a las reservas: vacía
  c = (await api.request('GET', `/calendar?desde=${sumar(desde, 30)}&dias=7`, { token: recepcion })).body.data;
  assert.equal(c.reservas.length, 0);
  assert.equal(c.bloqueos.length, 0);

  // Una estadía que empieza antes de la ventana pero la cruza sí aparece
  c = (await api.request('GET', `/calendar?desde=${sumar(desde, 1)}&dias=3`, { token: recepcion })).body.data;
  assert.ok(c.reservas.length >= 1);

  // límites: máximo 62 días; fecha inválida → 400
  c = (await api.request('GET', `/calendar?desde=${desde}&dias=500`, { token: recepcion })).body.data;
  assert.equal(c.dias, 62);
  assert.equal((await api.request('GET', '/calendar?desde=hoy', { token: recepcion })).status, 400);
});

test('el calendario respeta permisos y aislamiento entre hoteles', async () => {
  assert.equal((await api.request('GET', `/calendar?desde=${desde}`, { token: limpieza })).status, 403);
  assert.equal((await api.request('GET', `/calendar?desde=${desde}`)).status, 401);

  const otro = await api.login('admin.hotel-brisas-del-pacifico@salinasbooking.local', 'Demo12345!');
  const c = (await api.request('GET', `/calendar?desde=${desde}&dias=14`, { token: otro })).body.data;
  assert.equal(c.reservas.length, 0);
  assert.equal(c.bloqueos.length, 0);
  const propios = (await api.request('GET', '/rooms', { token: otro })).body.data.map((h) => h.id);
  assert.ok(c.habitaciones.every((h) => propios.includes(h.id)));

  // super_admin debe elegir el hotel
  const sup = await api.login('admin@salinasbooking.local', 'SuperAdmin123!');
  assert.equal((await api.request('GET', `/calendar?desde=${desde}`, { token: sup })).status, 400);
  assert.equal((await api.request('GET', `/calendar?desde=${desde}&hotel_id=${hotel.id}`, { token: sup })).status, 200);

  // recepción ve las opciones nuevas en su menú; limpieza no
  const claves = async (t) => (await api.request('GET', '/auth/menu', { token: t })).body.data.menu.map((i) => i.clave);
  const menuRecep = await claves(recepcion);
  assert.ok(menuRecep.includes('calendario') && menuRecep.includes('nueva-reserva'));
  const menuLimp = await claves(limpieza);
  assert.ok(!menuLimp.includes('calendario') && !menuLimp.includes('nueva-reserva'));
});
