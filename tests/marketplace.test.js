const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, proximoDia, sumar } = require('./helpers');
const { hoyISO } = require('../src/utils/dates');

let api;
const invitado = { nombres: 'Ana', apellidos: 'Pérez', email: 'ana@example.com', telefono: '0991234567' };

before(async () => {
  api = await arrancar();
});
after(async () => {
  await api.cerrar();
});

// Fechas de prueba: un mes adelante, jueves→domingo (incluye noches de fin de semana).
const jueves = proximoDia(4, sumar(hoyISO(), 30));
const entrada = jueves;
const salida = sumar(jueves, 3);

async function hotelId(slug) {
  const r = await api.request('GET', `/hotels/${slug}`);
  assert.equal(r.status, 200, `hotel ${slug}`);
  return r.body.data;
}

/* ======================================================
   CATÁLOGO Y BÚSQUEDA
====================================================== */
test('zonas del cantón con conteo de hoteles y precio desde', async () => {
  const r = await api.request('GET', '/zonas');
  assert.equal(r.status, 200);
  const chipipe = r.body.data.find((z) => z.slug === 'chipipe');
  assert.ok(chipipe);
  assert.equal(chipipe.total_hoteles, 1);
  assert.equal(chipipe.precio_desde, 55);
  assert.ok(r.body.data.length >= 8);
});

test('búsqueda sin fechas: catálogo con precio desde y facets', async () => {
  const r = await api.request('GET', '/search/hoteles');
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.total, 8);
  assert.ok(r.body.data.every((h) => h.precio_noche > 0));
  assert.ok(r.body.facets.zonas.length >= 6);
  assert.ok(r.body.facets.precio.min <= 22);
});

test('filtros: zona, amenidades, tipo, estrellas y precio', async () => {
  let r = await api.request('GET', '/search/hoteles?zona=chipipe');
  assert.deepEqual(r.body.data.map((h) => h.slug), ['casa-blanca']);

  r = await api.request('GET', '/search/hoteles?amenidades=piscina,spa');
  assert.deepEqual(r.body.data.map((h) => h.slug), ['puerto-lucia-suites']);

  r = await api.request('GET', '/search/hoteles?tipos=cabana');
  assert.deepEqual(r.body.data.map((h) => h.slug), ['cabanas-mar-bravo']);

  r = await api.request('GET', '/search/hoteles?estrellas=5');
  assert.equal(r.body.meta.total, 1);

  r = await api.request('GET', '/search/hoteles?precioMax=40&orden=precio_asc');
  const precios = r.body.data.map((h) => h.precio_noche);
  assert.ok(precios.length >= 2);
  assert.ok(precios.every((p) => p <= 40));
  assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
});

test('búsqueda con fechas devuelve precio total y respeta capacidad', async () => {
  let r = await api.request('GET', `/search/hoteles?checkIn=${entrada}&checkOut=${salida}&adultos=2`);
  assert.equal(r.status, 200);
  assert.equal(r.body.meta.noches, 3);
  assert.ok(r.body.data.every((h) => h.precio_total > 0 && h.habitaciones_disponibles > 0));

  // 6 personas en una sola habitación: solo caben en la suite de 2 dormitorios (6) de Puerto Lucía
  r = await api.request('GET', `/search/hoteles?checkIn=${entrada}&checkOut=${salida}&adultos=6`);
  assert.deepEqual(r.body.data.map((h) => h.slug), ['puerto-lucia-suites']);
});

test('parámetros inválidos → 422; fechas pasadas → 400', async () => {
  let r = await api.request('GET', '/search/hoteles?checkIn=2026-13-01&checkOut=2026-13-05');
  assert.equal(r.status, 400);
  r = await api.request('GET', `/search/hoteles?checkIn=${entrada}`);
  assert.equal(r.status, 422);
  r = await api.request('GET', '/search/hoteles?checkIn=2020-01-01&checkOut=2020-01-03');
  assert.equal(r.status, 400);
});

test('ficha del hotel: no expone la comisión y trae galería, amenidades y tipos', async () => {
  const h = await hotelId('casa-blanca');
  assert.equal(h.comision_porcentaje, undefined);
  assert.ok(h.imagenes.length >= 20);
  assert.ok(h.amenidades.some((a) => a.slug === 'wifi'));
  assert.equal(h.tiposHabitacion.length, 3);
  assert.equal(h.politica.nombre, 'moderada');
});

/* ======================================================
   PRECIOS
====================================================== */
test('cotización: temporada + tarifa de fin de semana por noche', async () => {
  const h = await hotelId('casa-blanca');
  const doble = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Doble');

  // Feb del año siguiente = alta temporada de playa (x1.5); vie/sáb = +20 %
  const anio = new Date().getUTCFullYear() + 1;
  const jue = proximoDia(4, `${anio}-02-01`);
  const r = await api.request('POST', '/bookings/quote', {
    body: {
      hotel_id: h.id,
      fecha_entrada: jue,
      fecha_salida: sumar(jue, 3),
      adultos: 2,
      habitaciones: [{ tipo_habitacion_id: doble.id }],
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const noches = r.body.data.habitaciones[0].por_noche.map((n) => n.precio);
  // jue: 55*1.5=82.5→83 ; vie/sáb: 55*1.5*1.2=99
  assert.deepEqual(noches, [83, 99, 99]);
  assert.equal(r.body.data.subtotal, 281);
  assert.equal(r.body.data.impuestos, 42.15); // IVA 15 %
  assert.equal(r.body.data.total, 323.15);
});

/* ======================================================
   RESERVAS Y DISPONIBILIDAD
====================================================== */
test('reserva de invitado: confirma, baja la disponibilidad y evita la sobreventa', async () => {
  const h = await hotelId('cabanas-mar-bravo'); // 5 cabañas pareja, 3 familiares
  const pareja = h.tiposHabitacion.find((t) => t.nombre === 'Cabaña Pareja');
  const cuerpo = (cantidad) => ({
    hotel_id: h.id,
    fecha_entrada: entrada,
    fecha_salida: salida,
    adultos: 2 * cantidad,
    habitaciones: [{ tipo_habitacion_id: pareja.id, cantidad }],
    contacto: invitado,
  });

  const r1 = await api.request('POST', '/bookings', { body: cuerpo(4) });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.match(r1.body.data.codigo_reserva, /^SB-[A-Z2-9]{8}$/);
  assert.equal(r1.body.data.estado, 'confirmada');
  assert.equal(r1.body.data.detalles.length, 4);
  assert.equal(new Set(r1.body.data.detalles.map((d) => d.habitacion_id)).size, 4);

  let disp = await api.request('GET', `/hotels/${h.slug}/availability?checkIn=${entrada}&checkOut=${salida}&adultos=2`);
  assert.equal(disp.body.data.habitaciones.find((t) => t.id === pareja.id).disponibles, 1);

  // Quedan 1: pedir 2 debe fallar con 409
  const r2 = await api.request('POST', '/bookings', { body: cuerpo(2) });
  assert.equal(r2.status, 409);
  assert.equal(r2.body.code, 'SIN_DISPONIBILIDAD');

  // Pedir 1 funciona; la siguiente ya no
  assert.equal((await api.request('POST', '/bookings', { body: cuerpo(1) })).status, 201);
  assert.equal((await api.request('POST', '/bookings', { body: cuerpo(1) })).status, 409);

  // Noche de salida libre: reservar desde la fecha de salida sí es posible
  const r3 = await api.request('POST', '/bookings', {
    body: { ...cuerpo(1), fecha_entrada: salida, fecha_salida: sumar(salida, 1) },
  });
  assert.equal(r3.status, 201);

  // El hotel agotado desaparece de la búsqueda solo si el grupo no cabe en otra opción
  disp = await api.request('GET', `/hotels/${h.slug}/availability?checkIn=${entrada}&checkOut=${salida}&adultos=2`);
  assert.equal(disp.body.data.habitaciones.find((t) => t.id === pareja.id).reservable, false);
});

test('validaciones de reserva: capacidad, fechas y datos de contacto', async () => {
  const h = await hotelId('hostal-las-palmeras-beach');
  const simple = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Simple');
  const base = {
    hotel_id: h.id,
    fecha_entrada: entrada,
    fecha_salida: salida,
    adultos: 1,
    habitaciones: [{ tipo_habitacion_id: simple.id }],
    contacto: invitado,
  };

  let r = await api.request('POST', '/bookings', { body: { ...base, adultos: 2 } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'CAPACIDAD_INSUFICIENTE');

  r = await api.request('POST', '/bookings', { body: { ...base, fecha_entrada: '2020-01-01', fecha_salida: '2020-01-03' } });
  assert.equal(r.status, 400);

  r = await api.request('POST', '/bookings', { body: { ...base, fecha_salida: entrada } });
  assert.equal(r.status, 400);

  r = await api.request('POST', '/bookings', { body: { ...base, contacto: { nombres: 'Solo Nombre' } } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'CONTACTO_INCOMPLETO');

  // Un invitado no puede fijar habitación concreta ni el cliente
  r = await api.request('POST', '/bookings', { body: { ...base, habitaciones: [{ habitacion_id: 1 }] } });
  assert.equal(r.status, 403);
  r = await api.request('POST', '/bookings', { body: { ...base, cliente_id: 1 } });
  assert.equal(r.status, 403);

  // Tipo de habitación de otro hotel
  const otro = await hotelId('casa-blanca');
  r = await api.request('POST', '/bookings', {
    body: { ...base, habitaciones: [{ tipo_habitacion_id: otro.tiposHabitacion[0].id }] },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'TIPO_INVALIDO');
});

test('reserva pendiente de pago retiene inventario y expira', async () => {
  const { models } = require('../src/models');
  const { expirarReservasPendientes } = require('../src/services/reservas.service');
  const h = await hotelId('hotel-anconcito-bay');
  const familiar = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Familiar'); // 3 unidades
  const entradaPend = sumar(entrada, 40);
  const cuerpo = {
    hotel_id: h.id,
    fecha_entrada: entradaPend,
    fecha_salida: sumar(entradaPend, 2),
    adultos: 12,
    habitaciones: [{ tipo_habitacion_id: familiar.id, cantidad: 3 }],
    contacto: invitado,
    pago_en_hotel: false,
  };

  const r = await api.request('POST', '/bookings', { body: cuerpo });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.estado, 'pendiente');
  assert.ok(r.body.data.expira_en);

  const q = `/hotels/${h.slug}/availability?checkIn=${entradaPend}&checkOut=${cuerpo.fecha_salida}&adultos=2`;
  assert.equal((await api.request('GET', q)).body.data.habitaciones.find((t) => t.id === familiar.id).disponibles, 0);

  // Vence la retención → vuelve a estar disponible aunque nadie la haya cancelado todavía
  await models.Reserva.update({ expira_en: new Date(Date.now() - 1000) }, { where: { id: r.body.data.id } });
  assert.equal((await api.request('GET', q)).body.data.habitaciones.find((t) => t.id === familiar.id).disponibles, 3);

  assert.equal(await expirarReservasPendientes(), 1);
  const rr = await models.Reserva.findByPk(r.body.data.id);
  assert.equal(rr.estado, 'cancelada');
});

/* ======================================================
   CUENTA DEL HUÉSPED
====================================================== */
test('registro, reserva autenticada, mis reservas, cancelación y consulta por código', async () => {
  const email = 'huesped@example.com';
  let r = await api.request('POST', '/auth/register', {
    body: { nombre: 'Luis', apellido: 'Mora', email, password: 'Clave12345' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.rol, 'cliente');

  // No se puede registrar un rol privilegiado por la API pública
  r = await api.request('POST', '/auth/register', {
    body: { nombre: 'Mal', apellido: 'Actor', email: 'mal@example.com', password: 'Clave12345', rol: 'super_admin', hotel_id: 1 },
  });
  assert.equal(r.body.data.rol, 'cliente');
  assert.equal(r.body.data.hotel_id, null);

  const token = await api.login(email, 'Clave12345');
  const h = await hotelId('hotel-brisas-del-pacifico');
  const est = h.tiposHabitacion.find((t) => t.nombre === 'Estándar Doble');
  const lejos = sumar(entrada, 60);

  r = await api.request('POST', '/bookings', {
    token,
    body: {
      hotel_id: h.id,
      fecha_entrada: lejos,
      fecha_salida: sumar(lejos, 2),
      adultos: 2,
      habitaciones: [{ tipo_habitacion_id: est.id }],
      contacto: { telefono: '0987654321' },
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const reserva = r.body.data;
  assert.equal(reserva.cliente.email, email);
  assert.equal(reserva.cancelacion.gratis, true);

  r = await api.request('GET', '/bookings', { token });
  assert.equal(r.body.meta.total, 1);

  // Otro usuario no ve ni cancela mi reserva
  await api.request('POST', '/auth/register', { body: { nombre: 'Otro', apellido: 'User', email: 'otro@example.com', password: 'Clave12345' } });
  const tokenOtro = await api.login('otro@example.com', 'Clave12345');
  assert.equal((await api.request('GET', `/bookings/${reserva.id}`, { token: tokenOtro })).status, 404);
  assert.equal((await api.request('PATCH', `/bookings/${reserva.id}/cancelar`, { token: tokenOtro, body: {} })).status, 404);
  assert.equal((await api.request('GET', '/bookings', { token: tokenOtro })).body.meta.total, 0);

  // Consulta pública: código + email correcto; email incorrecto no revela nada
  r = await api.request('POST', '/bookings/lookup', { body: { codigo: reserva.codigo_reserva, email } });
  assert.equal(r.status, 200);
  r = await api.request('POST', '/bookings/lookup', { body: { codigo: reserva.codigo_reserva, email: 'x@example.com' } });
  assert.equal(r.status, 404);

  // Cancelación por el dueño; no se puede cancelar dos veces
  r = await api.request('PATCH', `/bookings/${reserva.id}/cancelar`, { token, body: { motivo: 'Cambio de planes' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.estado, 'cancelada');
  r = await api.request('PATCH', `/bookings/${reserva.id}/cancelar`, { token, body: {} });
  assert.equal(r.status, 409);
});

test('registrarse con el correo de una reserva de invitado NO otorga acceso a esa reserva', async () => {
  const h = await hotelId('hostal-las-palmeras-beach');
  const doble = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Doble');
  const lejos = sumar(entrada, 90);
  const email = 'invitado.historial@example.com';
  const r = await api.request('POST', '/bookings', {
    body: {
      hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: doble.id }], contacto: { ...invitado, email },
    },
  });
  assert.equal(r.status, 201);

  await api.request('POST', '/auth/register', { body: { nombre: 'Inv', apellido: 'Hist', email, password: 'Clave12345' } });
  const token = await api.login(email, 'Clave12345');
  // Sin verificación de correo, vincular por email permitiría apropiarse de reservas ajenas.
  assert.equal((await api.request('GET', '/bookings', { token })).body.meta.total, 0);
  const codigo = r.body.data.codigo_reserva;
  assert.equal((await api.request('POST', '/bookings/lookup', { body: { codigo, email } })).status, 200);
});

/* ======================================================
   AISLAMIENTO ENTRE HOTELES
====================================================== */
test('un admin solo ve y modifica los datos de su propio hotel', async () => {
  const tokenA = await api.login('admin.casa-blanca@salinasbooking.local', 'Demo12345!');
  const tokenB = await api.login('admin.hotel-brisas-del-pacifico@salinasbooking.local', 'Demo12345!');
  const hA = await hotelId('casa-blanca');
  const hB = await hotelId('hotel-brisas-del-pacifico');

  // Reserva en B
  const est = hB.tiposHabitacion[0];
  const lejos = sumar(entrada, 120);
  const rb = await api.request('POST', '/bookings', {
    body: {
      hotel_id: hB.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: est.id }], contacto: invitado,
    },
  });
  assert.equal(rb.status, 201);

  // A no la ve ni por listado ni por id, ni la puede operar
  const lista = await api.request('GET', '/bookings', { token: tokenA });
  assert.ok(lista.body.data.every((r) => r.hotel_id === hA.id));
  assert.ok(!lista.body.data.some((r) => r.id === rb.body.data.id));
  assert.equal((await api.request('GET', `/bookings/${rb.body.data.id}`, { token: tokenA })).status, 404);
  assert.equal((await api.request('PATCH', `/bookings/${rb.body.data.id}/cancelar`, { token: tokenA, body: {} })).status, 404);

  // Recursos de gestión: solo los propios
  const tiposA = await api.request('GET', '/room-types', { token: tokenA });
  assert.ok(tiposA.body.data.every((t) => t.hotel_id === hA.id));
  assert.equal((await api.request('GET', `/room-types/${est.id}`, { token: tokenA })).status, 404);
  assert.equal((await api.request('PUT', `/room-types/${est.id}`, { token: tokenA, body: { nombre: 'Hackeado' } })).status, 404);
  assert.equal((await api.request('DELETE', `/rooms/${1}`, { token: tokenB })).status, 404); // habitación de otro hotel

  // hotel_id en el body/query/header se ignora para no-super_admin
  const creado = await api.request('POST', '/services?hotel_id=' + hB.id, {
    token: tokenA, body: { nombre: 'Tour ballenas', precio: 25, hotel_id: hB.id },
  });
  assert.equal(creado.status, 201);
  assert.equal(creado.body.data.hotel_id, hA.id);

  // No puede crear un tipo asociando una tarifa a un tipo de otro hotel
  const temporadasA = (await api.request('GET', '/temporadas', { token: tokenA })).body.data;
  const tarifa = await api.request('POST', '/tarifas', {
    token: tokenA, body: { tipo_habitacion_id: est.id, temporada_id: temporadasA[0].id, precio: 1 },
  });
  assert.equal(tarifa.status, 400);
  assert.equal(tarifa.body.code, 'RELACION_INVALIDA');

  // Pagos y reportes acotados
  assert.equal((await api.request('POST', '/payments', { token: tokenA, body: { reserva_id: rb.body.data.id, monto: 10, metodo: 'efectivo' } })).status, 404);
  const dash = await api.request('GET', '/reports/dashboard', { token: tokenA });
  assert.equal(dash.status, 200);

  // Un admin de hotel no puede crear otros admins ni usar rutas de plataforma
  assert.equal((await api.request('POST', '/admin/usuarios', { token: tokenA, body: { nombre: 'Xx', apellido: 'Yy', email: 'x@y.com', password: 'Clave12345', rol: 'admin' } })).status, 403);
  assert.equal((await api.request('GET', '/platform/stats', { token: tokenA })).status, 403);
  assert.equal((await api.request('PUT', `/manage/hotel`, { token: tokenA, body: { comision_porcentaje: 0, estado: 'inactivo' } })).status, 200);
  const perfil = await api.request('GET', '/manage/hotel', { token: tokenA });
  assert.equal(Number(perfil.body.data.comision_porcentaje), 10); // campos de plataforma ignorados
  assert.equal(perfil.body.data.estado, 'activo');
});

test('permisos por rol y por sesión', async () => {
  assert.equal((await api.request('GET', '/room-types')).status, 401);
  assert.equal((await api.request('GET', '/room-types', { token: 'basura' })).status, 401);

  await api.request('POST', '/auth/register', { body: { nombre: 'Cli', apellido: 'Ente', email: 'cliente.rol@example.com', password: 'Clave12345' } });
  const tokenCli = await api.login('cliente.rol@example.com', 'Clave12345');
  assert.equal((await api.request('GET', '/room-types', { token: tokenCli })).status, 403);
  assert.equal((await api.request('GET', '/reports/dashboard', { token: tokenCli })).status, 403);
  assert.equal((await api.request('PATCH', '/bookings/1/checkin', { token: tokenCli })).status, 403);

  // Credenciales incorrectas: mismo mensaje exista o no el usuario
  const a = await api.request('POST', '/auth/login', { body: { email: 'cliente.rol@example.com', password: 'incorrecta1' } });
  const b = await api.request('POST', '/auth/login', { body: { email: 'noexiste@example.com', password: 'incorrecta1' } });
  assert.equal(a.status, 401);
  assert.equal(a.body.message, b.body.message);

  // Un usuario desactivado pierde el acceso aunque su token siga vigente
  const { models } = require('../src/models');
  await models.User.update({ estado: 'inactivo' }, { where: { email: 'cliente.rol@example.com' } });
  assert.equal((await api.request('GET', '/auth/me', { token: tokenCli })).status, 401);
});

test('super_admin opera cualquier hotel y da de alta hoteles con su administrador', async () => {
  const token = await api.login('admin@salinasbooking.local', 'SuperAdmin123!');

  // Sin hotel_id en una escritura → error claro
  let r = await api.request('POST', '/services', { token, body: { nombre: 'Xx', precio: 1 } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'HOTEL_REQUERIDO');

  const nuevo = await api.request('POST', '/platform/hotels', {
    token,
    body: {
      hotel: { nombre: 'Hotel Nuevo Salinas', ciudad: 'Salinas', tipo_alojamiento: 'hostal', estrellas: 2, estado: 'pendiente', comision_porcentaje: 8 },
      propietario: { nombre: 'Dueño', apellido: 'Nuevo', email: 'dueno@nuevo.com', password: 'Clave12345' },
    },
  });
  assert.equal(nuevo.status, 201, JSON.stringify(nuevo.body));
  assert.equal(nuevo.body.data.hotel.slug, 'hotel-nuevo-salinas');

  // Pendiente: no aparece en el catálogo público hasta ser aprobado
  assert.equal((await api.request('GET', '/hotels/hotel-nuevo-salinas')).status, 404);
  r = await api.request('PATCH', `/platform/hotels/${nuevo.body.data.hotel.id}/estado`, { token, body: { estado: 'activo' } });
  assert.equal(r.status, 200);
  assert.equal((await api.request('GET', '/hotels/hotel-nuevo-salinas')).status, 200);

  // El nuevo dueño entra y solo ve su hotel
  const tokenDueno = await api.login('dueno@nuevo.com', 'Clave12345');
  const perfil = await api.request('GET', '/manage/hotel', { token: tokenDueno });
  assert.equal(perfil.body.data.nombre, 'Hotel Nuevo Salinas');
  r = await api.request('POST', '/room-types', {
    token: tokenDueno, body: { nombre: 'Doble', capacidad_maxima: 2, precio_base: 30 },
  });
  assert.equal(r.status, 201);

  // Sin precio configurado en tarifas, precio_base hace reservable al hotel de inmediato
  const tipoId = r.body.data.id;
  await api.request('POST', '/rooms', { token: tokenDueno, body: { tipo_habitacion_id: tipoId, numero_habitacion: '1' } });
  const lejos = sumar(entrada, 20);
  r = await api.request('POST', '/bookings/quote', {
    body: { hotel_id: nuevo.body.data.hotel.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 2), adultos: 2, habitaciones: [{ tipo_habitacion_id: tipoId }] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.subtotal, 60);

  const stats = await api.request('GET', '/platform/stats', { token });
  assert.equal(stats.status, 200);
  assert.ok(stats.body.data.hoteles >= 9);
});

/* ======================================================
   CICLO DE VIDA Y RESEÑAS
====================================================== */
test('check-in / check-out, pagos, y reseña verificada que actualiza el rating', async () => {
  const email = 'resena@example.com';
  await api.request('POST', '/auth/register', { body: { nombre: 'Rita', apellido: 'Vega', email, password: 'Clave12345' } });
  const token = await api.login(email, 'Clave12345');
  const tokenAdmin = await api.login('admin.hotel-brisas-del-pacifico@salinasbooking.local', 'Demo12345!');
  const h = await hotelId('hotel-brisas-del-pacifico');
  const hoy = hoyISO();

  const r = await api.request('POST', '/bookings', {
    token,
    body: {
      hotel_id: h.id, fecha_entrada: hoy, fecha_salida: sumar(hoy, 2), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: h.tiposHabitacion[0].id }], contacto: { telefono: '0991112223' },
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.data.id;
  const total = r.body.data.precio_total;

  // No se puede reseñar antes de la estadía
  const intento = await api.request('POST', '/reviews', { token, body: { reserva_id: id, puntuacion: 10 } });
  assert.equal(intento.status, 409);

  // Transiciones inválidas
  assert.equal((await api.request('PATCH', `/bookings/${id}/checkout`, { token: tokenAdmin })).status, 409);

  let s = await api.request('PATCH', `/bookings/${id}/checkin`, { token: tokenAdmin });
  assert.equal(s.status, 200);
  assert.equal(s.body.data.estado, 'check_in');

  // Pagos: no pueden exceder el saldo
  assert.equal((await api.request('POST', '/payments', { token: tokenAdmin, body: { reserva_id: id, monto: total + 1, metodo: 'efectivo' } })).status, 400);
  const pago = await api.request('POST', '/payments', { token: tokenAdmin, body: { reserva_id: id, monto: total, metodo: 'efectivo' } });
  assert.equal(pago.status, 201);
  assert.equal(pago.body.data.saldo, 0);

  s = await api.request('PATCH', `/bookings/${id}/checkout`, { token: tokenAdmin });
  assert.equal(s.body.data.estado, 'check_out');
  assert.equal(s.body.data.saldo, 0);

  const antes = (await hotelId('hotel-brisas-del-pacifico')).rating_promedio;
  const resena = await api.request('POST', '/reviews', { token, body: { reserva_id: id, puntuacion: 10, titulo: 'Genial', comentario: 'Todo perfecto' } });
  assert.equal(resena.status, 201, JSON.stringify(resena.body));
  assert.notEqual(Number((await hotelId('hotel-brisas-del-pacifico')).rating_promedio), Number(antes));

  // Una sola reseña por reserva
  assert.equal((await api.request('POST', '/reviews', { token, body: { reserva_id: id, puntuacion: 5 } })).status, 409);

  const lista = await api.request('GET', `/hotels/${h.slug}/reviews`);
  assert.ok(lista.body.data.some((x) => x.titulo === 'Genial' && x.verificada && x.autor === 'Rita'));

  // El hotel responde
  const resp = await api.request('POST', `/manage/reviews/${resena.body.data.id}/respuesta`, { token: tokenAdmin, body: { respuesta: '¡Gracias por visitarnos!' } });
  assert.equal(resp.status, 200);
});

test('favoritos', async () => {
  const token = await api.login('huesped@example.com', 'Clave12345');
  const h = await hotelId('casa-blanca');
  assert.equal((await api.request('PUT', `/favorites/${h.id}`, { token })).status, 200);
  assert.equal((await api.request('PUT', `/favorites/${h.id}`, { token })).status, 200); // idempotente
  assert.equal((await api.request('GET', '/favorites', { token })).body.data.length, 1);
  await api.request('DELETE', `/favorites/${h.id}`, { token });
  assert.equal((await api.request('GET', '/favorites', { token })).body.data.length, 0);
});

test('habitación bloqueada no se vende y una habitación con reservas se desactiva en vez de borrarse', async () => {
  const tokenAdmin = await api.login('admin.casa-blanca@salinasbooking.local', 'Demo12345!');
  const h = await hotelId('casa-blanca');
  const suite = h.tiposHabitacion.find((t) => t.nombre === 'Suite Frente al Mar'); // 3 unidades
  const salas = (await api.request('GET', `/rooms?tipo_habitacion_id=${suite.id}`, { token: tokenAdmin })).body.data;
  assert.equal(salas.length, 3);
  const lejos = sumar(entrada, 150);

  // Bloqueamos 2 de 3
  for (const hab of salas.slice(0, 2)) {
    const b = await api.request('POST', '/bloqueos', {
      token: tokenAdmin, body: { habitacion_id: hab.id, fecha_inicio: lejos, fecha_fin: sumar(lejos, 3), tipo_bloqueo: 'mantenimiento' },
    });
    assert.equal(b.status, 201, JSON.stringify(b.body));
  }
  const q = `/hotels/casa-blanca/availability?checkIn=${lejos}&checkOut=${sumar(lejos, 2)}&adultos=2`;
  assert.equal((await api.request('GET', q)).body.data.habitaciones.find((t) => t.id === suite.id).disponibles, 1);

  // Reservamos la última y luego "borrarla" solo la desactiva
  const rb = await api.request('POST', '/bookings', {
    token: tokenAdmin,
    body: {
      hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 2), adultos: 2,
      habitaciones: [{ habitacion_id: salas[2].id }], contacto: invitado, canal: 'telefono',
    },
  });
  assert.equal(rb.status, 201, JSON.stringify(rb.body));
  assert.equal(rb.body.data.canal, 'telefono');
  const del = await api.request('DELETE', `/rooms/${salas[2].id}`, { token: tokenAdmin });
  assert.equal(del.status, 200);
  const hab = await api.request('GET', `/rooms/${salas[2].id}`, { token: tokenAdmin });
  assert.equal(hab.body.data.estado, 'inactiva');
});

test('un invitado cancela con código + email; con datos incorrectos no puede', async () => {
  const h = await hotelId('hostal-las-palmeras-beach');
  const doble = h.tiposHabitacion.find((t) => t.nombre === 'Habitación Doble');
  const lejos = sumar(entrada, 200);
  const email = 'cancela.invitado@example.com';
  const r = await api.request('POST', '/bookings', {
    body: {
      hotel_id: h.id, fecha_entrada: lejos, fecha_salida: sumar(lejos, 1), adultos: 2,
      habitaciones: [{ tipo_habitacion_id: doble.id }], contacto: { ...invitado, email },
    },
  });
  assert.equal(r.status, 201);
  const codigo = r.body.data.codigo_reserva;

  let c = await api.request('POST', '/bookings/lookup/cancelar', { body: { codigo, email: 'otro@example.com' } });
  assert.equal(c.status, 404);

  c = await api.request('POST', '/bookings/lookup/cancelar', { body: { codigo, email, motivo: 'Ya no viajo' } });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  assert.equal(c.body.data.estado, 'cancelada');

  // Ya cancelada: no se puede volver a cancelar
  c = await api.request('POST', '/bookings/lookup/cancelar', { body: { codigo, email } });
  assert.equal(c.status, 409);
});
