// Roles, permisos y menú lateral guardados en la base de datos.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, proximoDia, sumar } = require('./helpers');
const { hoyISO } = require('../src/utils/dates');

let api;
let superToken;
let adminToken;
const tokens = {};
const entrada = proximoDia(4, sumar(hoyISO(), 30));

before(async () => {
  api = await arrancar();
  superToken = await api.login('admin@salinasbooking.local', 'SuperAdmin123!');
  adminToken = await api.login('admin.casa-blanca@salinasbooking.local', 'Demo12345!');
  // El admin del hotel crea una persona por cada rol asignable
  for (const rol of ['recepcion', 'limpieza', 'contabilidad']) {
    const r = await api.request('POST', '/admin/usuarios', {
      token: adminToken,
      body: { nombre: 'Persona', apellido: rol, email: `${rol}@cb.com`, password: 'Clave12345', rol },
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    tokens[rol] = await api.login(`${rol}@cb.com`, 'Clave12345');
  }
});
after(async () => {
  await api.cerrar();
});

const menu = async (token) => (await api.request('GET', '/auth/menu', { token })).body.data;
const claves = (m) => m.menu.map((i) => i.clave);

test('cada rol recibe de la base de datos solo las opciones de menú que puede usar', async () => {
  const sup = await menu(superToken);
  assert.equal(sup.alcance, 'plataforma');
  assert.ok(['hoteles', 'roles', 'tarifas', 'reservas'].every((c) => claves(sup).includes(c)));

  const adm = await menu(adminToken);
  assert.equal(adm.alcance, 'hotel');
  assert.ok(claves(adm).includes('tarifas'));
  assert.ok(!claves(adm).includes('hoteles') && !claves(adm).includes('roles'));

  assert.deepEqual(claves(await menu(tokens.recepcion)), ['resumen', 'calendario', 'reservas', 'nueva-reserva', 'habitaciones']);
  assert.deepEqual(claves(await menu(tokens.limpieza)), ['habitaciones']);
  assert.deepEqual(claves(await menu(tokens.contabilidad)), ['resumen', 'reservas']);

  // huésped: sin menú
  await api.request('POST', '/auth/register', { body: { nombre: 'Cli', apellido: 'Ente', email: 'cli@x.com', password: 'Clave12345' } });
  const cli = await menu(await api.login('cli@x.com', 'Clave12345'));
  assert.equal(cli.alcance, 'cliente');
  assert.deepEqual(cli.menu, []);
});

test('el servidor hace cumplir los permisos, no solo el menú', async () => {
  const get = (t, p) => api.request('GET', p, { token: t });

  // recepción: reservas y habitaciones sí; tarifas, personal y reportes no
  assert.equal((await get(tokens.recepcion, '/bookings')).status, 200);
  assert.equal((await get(tokens.recepcion, '/rooms')).status, 200);
  assert.equal((await get(tokens.recepcion, '/tarifas')).status, 403);
  assert.equal((await get(tokens.recepcion, '/admin/usuarios')).status, 403);
  assert.equal((await get(tokens.recepcion, '/reports/ocupacion')).status, 403);

  // limpieza: solo habitaciones
  assert.equal((await get(tokens.limpieza, '/rooms')).status, 200);
  assert.equal((await get(tokens.limpieza, '/bookings')).status, 403);
  assert.equal((await get(tokens.limpieza, '/payments')).status, 403);
  assert.equal((await api.request('POST', '/bookings/1/checkin', { token: tokens.limpieza })).status, 404); // ruta PATCH inexistente para POST
  assert.equal((await api.request('PATCH', '/bookings/1/checkin', { token: tokens.limpieza })).status, 403);

  // contabilidad: lee, pero no escribe
  assert.equal((await get(tokens.contabilidad, '/payments')).status, 200);
  assert.equal((await get(tokens.contabilidad, '/reports/ocupacion')).status, 200);
  assert.equal((await api.request('POST', '/payments', { token: tokens.contabilidad, body: { reserva_id: 1, monto: 5, metodo: 'efectivo' } })).status, 403);
  assert.equal((await api.request('PATCH', '/bookings/1/confirmar', { token: tokens.contabilidad })).status, 403);
  const hotel = (await api.request('GET', '/hotels/casa-blanca')).body.data;
  const crear = await api.request('POST', '/bookings', {
    token: tokens.contabilidad,
    body: { hotel_id: hotel.id, fecha_entrada: entrada, fecha_salida: sumar(entrada, 1), adultos: 1, habitaciones: [{ tipo_habitacion_id: hotel.tiposHabitacion[0].id }], contacto: { nombres: 'Ana', apellidos: 'Bo', email: 'a@b.com', telefono: '0991234567' } },
  });
  assert.equal(crear.status, 403);
});

test('limpieza cambia el estado de una habitación pero no sus demás datos', async () => {
  const hab = (await api.request('GET', '/rooms', { token: tokens.limpieza })).body.data[0];
  let r = await api.request('PUT', `/rooms/${hab.id}`, { token: tokens.limpieza, body: { estado: 'limpieza' } });
  assert.equal(r.status, 200);
  r = await api.request('PUT', `/rooms/${hab.id}`, { token: tokens.limpieza, body: { numero_habitacion: '999' } });
  assert.equal(r.status, 403);
  r = await api.request('PUT', `/rooms/${hab.id}`, { token: tokens.limpieza, body: { estado: 'disponible', piso: 9 } });
  assert.equal(r.status, 403);
  assert.equal((await api.request('DELETE', `/rooms/${hab.id}`, { token: tokens.limpieza })).status, 403);
});

test('los cambios de permisos desde la plataforma surten efecto de inmediato', async () => {
  const roles = (await api.request('GET', '/platform/roles', { token: superToken })).body.data;
  const limpieza = roles.find((r) => r.clave === 'limpieza');

  assert.equal((await api.request('GET', '/bookings', { token: tokens.limpieza })).status, 403);
  let r = await api.request('PUT', `/platform/roles/${limpieza.id}/permisos`, { token: superToken, body: { permisos: [...limpieza.permisos, 'reservas.ver'] } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await api.request('GET', '/bookings', { token: tokens.limpieza })).status, 200);
  assert.ok(claves(await menu(tokens.limpieza)).includes('reservas'));

  r = await api.request('PUT', `/platform/roles/${limpieza.id}/permisos`, { token: superToken, body: { permisos: limpieza.permisos } });
  assert.equal(r.status, 200);
  assert.equal((await api.request('GET', '/bookings', { token: tokens.limpieza })).status, 403);
});

test('protecciones: permisos de plataforma, rol super_admin y acceso al panel de roles', async () => {
  const roles = (await api.request('GET', '/platform/roles', { token: superToken })).body.data;
  const recep = roles.find((r) => r.clave === 'recepcion');
  const sup = roles.find((r) => r.clave === 'super_admin');

  // Un rol de hotel no puede recibir permisos de plataforma
  let r = await api.request('PUT', `/platform/roles/${recep.id}/permisos`, { token: superToken, body: { permisos: ['plataforma.gestionar'] } });
  assert.equal(r.status, 400);
  // El rol de plataforma no se puede recortar
  r = await api.request('PUT', `/platform/roles/${sup.id}/permisos`, { token: superToken, body: { permisos: [] } });
  assert.equal(r.status, 409);
  // Permiso inexistente
  r = await api.request('PUT', `/platform/roles/${recep.id}/permisos`, { token: superToken, body: { permisos: ['inventado.x'] } });
  assert.equal(r.status, 400);
  // Roles de sistema no se borran; los roles en uso tampoco
  assert.equal((await api.request('DELETE', `/platform/roles/${recep.id}`, { token: superToken })).status, 409);

  // El personal de hotel no entra al panel de plataforma
  for (const t of [adminToken, tokens.recepcion]) {
    assert.equal((await api.request('GET', '/platform/roles', { token: t })).status, 403);
    assert.equal((await api.request('PUT', `/platform/roles/${recep.id}/permisos`, { token: t, body: { permisos: [] } })).status, 403);
  }

  // No se puede desactivar la opción de menú de administración de roles
  const items = (await api.request('GET', '/platform/menu', { token: superToken })).body.data;
  const rolesItem = items.find((i) => i.clave === 'roles');
  assert.equal((await api.request('PUT', `/platform/menu/${rolesItem.id}`, { token: superToken, body: { activo: false } })).status, 409);
});

test('roles nuevos: se crean como datos, y solo se asignan si la plataforma lo permite', async () => {
  let r = await api.request('POST', '/platform/roles', {
    token: superToken,
    body: { clave: 'mantenimiento', nombre: 'Mantenimiento', permisos: ['habitaciones.ver', 'habitaciones.estado', 'bloqueos.gestionar'] },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const rolId = r.body.data.id;

  // Aún no es asignable por un admin de hotel
  const nuevo = { nombre: 'Mario', apellido: 'Mant', email: 'mario@cb.com', password: 'Clave12345', rol: 'mantenimiento' };
  assert.equal((await api.request('POST', '/admin/usuarios', { token: adminToken, body: nuevo })).status, 403);
  assert.ok(!(await api.request('GET', '/admin/roles', { token: adminToken })).body.data.some((x) => x.clave === 'mantenimiento'));

  await api.request('PUT', `/platform/roles/${rolId}`, { token: superToken, body: { asignable_por_hotel: true } });
  r = await api.request('POST', '/admin/usuarios', { token: adminToken, body: nuevo });
  assert.equal(r.status, 201, JSON.stringify(r.body));

  const token = await api.login('mario@cb.com', 'Clave12345');
  assert.deepEqual(claves(await menu(token)), ['habitaciones']);
  assert.equal((await api.request('GET', '/tarifas', { token })).status, 403);

  // Un rol en uso no se puede eliminar; un rol inexistente en el body no se asigna
  assert.equal((await api.request('DELETE', `/platform/roles/${rolId}`, { token: superToken })).status, 409);
  assert.equal((await api.request('POST', '/admin/usuarios', { token: adminToken, body: { ...nuevo, email: 'x@cb.com', rol: 'fantasma' } })).status, 400);
  assert.equal((await api.request('POST', '/admin/usuarios', { token: superToken, body: { ...nuevo, email: 'y@cb.com', rol: 'fantasma', hotel_id: 1 } })).status, 400);
  // super_admin no puede crear roles de plataforma a través del alta de personal
  assert.equal((await api.request('POST', '/admin/usuarios', { token: superToken, body: { ...nuevo, email: 'z@cb.com', rol: 'super_admin', hotel_id: 1 } })).status, 400);
});

test('un rol desconocido en la base de datos falla cerrado (sin acceso)', async () => {
  const { models } = require('../src/models');
  await models.User.update({ rol: 'rol_borrado' }, { where: { email: 'recepcion@cb.com' } });
  const rbac = require('../src/services/rbac.service');
  rbac.invalidar();
  // Pasa a ser un huésped sin permisos: solo ve sus propias reservas y nada del panel.
  assert.equal((await api.request('GET', '/rooms', { token: tokens.recepcion })).status, 403);
  assert.equal((await api.request('GET', '/tarifas', { token: tokens.recepcion })).status, 403);
  assert.equal((await api.request('PATCH', '/bookings/1/confirmar', { token: tokens.recepcion })).status, 403);
  assert.deepEqual((await menu(tokens.recepcion)).menu, []);
});
