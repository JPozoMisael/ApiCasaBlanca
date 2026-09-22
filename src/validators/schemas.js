const Joi = require('joi');

// tlds:false → acepta dominios internos (.local) usados en desarrollo/seed
const EMAIL_OPTS = { tlds: { allow: false } };
const id = Joi.number().integer().positive();
const fecha = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('Formato de fecha inválido (YYYY-MM-DD)');
const texto = (max = 255) => Joi.string().trim().max(max);
const opcional = (schema) => schema.allow('', null);

// Acepta "a,b,c" o ?a=1&a=2 y devuelve siempre un array.
const lista = (item = Joi.string().trim()) =>
  Joi.alternatives().try(Joi.array().items(item), Joi.string().custom((v) => v.split(',').map((s) => s.trim()).filter(Boolean)));

/* ---------------- AUTH ---------------- */
const login = Joi.object({
  email: Joi.string().email(EMAIL_OPTS).max(100).trim().lowercase().required(),
  password: Joi.string().min(6).max(100).required(),
});

const register = Joi.object({
  nombre: texto(100).min(2).required(),
  apellido: texto(100).min(2).required(),
  email: Joi.string().email(EMAIL_OPTS).max(100).trim().lowercase().required(),
  password: Joi.string().min(8).max(100).required(),
});

const perfilUpdate = Joi.object({
  nombre: texto(100).min(2),
  apellido: texto(100).min(2),
}).min(1);

const cambiarPassword = Joi.object({
  actual: Joi.string().required(),
  nueva: Joi.string().min(8).max(100).required(),
});

/* ---------------- BÚSQUEDA / DISPONIBILIDAD (query) ---------------- */
const buscar = Joi.object({
  zona: texto(100),
  q: texto(100),
  checkIn: fecha,
  checkOut: fecha,
  adultos: Joi.number().integer().min(1).max(30).default(2),
  ninos: Joi.number().integer().min(0).max(20).default(0),
  habitaciones: Joi.number().integer().min(1).max(6).default(1),
  precioMin: Joi.number().min(0),
  precioMax: Joi.number().min(0),
  estrellas: Joi.number().integer().min(1).max(5),
  rating: Joi.number().min(0).max(10),
  tipos: lista(Joi.string().valid('hotel', 'hostal', 'hosteria', 'apart_hotel', 'cabana', 'villa', 'departamento')),
  amenidades: lista(),
  orden: Joi.string().valid('recomendado', 'precio_asc', 'precio_desc', 'rating', 'estrellas').default('recomendado'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
}).and('checkIn', 'checkOut');

const disponibilidad = Joi.object({
  checkIn: fecha.required(),
  checkOut: fecha.required(),
  adultos: Joi.number().integer().min(1).max(30).default(2),
  ninos: Joi.number().integer().min(0).max(20).default(0),
});

const paginacion = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

/* ---------------- RESERVAS ---------------- */
const contacto = Joi.object({
  nombres: texto(100).min(2),
  apellidos: texto(100).min(1),
  email: Joi.string().email(EMAIL_OPTS).max(100).trim().lowercase(),
  telefono: texto(20).min(7),
  documento_identidad: opcional(texto(50)),
  tipo_documento: opcional(Joi.string().valid('cedula', 'pasaporte', 'dni')),
  nacionalidad: opcional(texto(50)),
});

const itemHabitacion = Joi.object({
  tipo_habitacion_id: id,
  habitacion_id: id, // solo personal del hotel puede fijar una habitación concreta
  cantidad: Joi.number().integer().min(1).max(6).default(1),
}).xor('tipo_habitacion_id', 'habitacion_id');

const reservaBase = {
  hotel_id: id.required(),
  fecha_entrada: fecha.required(),
  fecha_salida: fecha.required(),
  adultos: Joi.number().integer().min(1).max(30).required(),
  ninos: Joi.number().integer().min(0).max(20).default(0),
  habitaciones: Joi.array().items(itemHabitacion).min(1).max(6).required(),
  servicios: Joi.array()
    .items(Joi.object({ servicio_id: id.required(), cantidad: Joi.number().integer().min(1).max(50).default(1) }))
    .max(20)
    .default([]),
};

const cotizarReserva = Joi.object(reservaBase);

const crearReserva = Joi.object({
  ...reservaBase,
  contacto,
  cliente_id: id, // solo personal
  observaciones: opcional(texto(1000)),
  pago_en_hotel: Joi.boolean().default(true),
  canal: Joi.string().valid('recepcion', 'telefono', 'whatsapp'),
  estado_inicial: Joi.string().valid('pendiente', 'confirmada'),
});

const consultaReserva = Joi.object({
  codigo: texto(20).required(),
  email: Joi.string().email(EMAIL_OPTS).required(),
});

const cancelarReserva = Joi.object({ motivo: opcional(texto(300)) });

const filtrosReservas = Joi.object({
  estado: lista(Joi.string().valid('pendiente', 'confirmada', 'check_in', 'check_out', 'cancelada', 'no_show')),
  desde: fecha,
  hasta: fecha,
  texto: texto(100),
  hotel_id: id,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const actualizarReserva = Joi.object({ observaciones: opcional(texto(1000)) }).min(1);

/* ---------------- VALORACIONES ---------------- */
const crearValoracion = Joi.object({
  reserva_id: id.required(),
  puntuacion: Joi.number().integer().min(1).max(10).required(),
  titulo: opcional(texto(150)),
  comentario: opcional(texto(3000)),
});

const responderValoracion = Joi.object({ respuesta: texto(2000).min(2).required() });

/* ---------------- HOTEL ---------------- */
const camposHotel = {
  nombre: texto(100).min(2),
  descripcion: opcional(Joi.string().max(5000)),
  direccion: opcional(texto(200)),
  ciudad: texto(50).min(2),
  zona_id: opcional(id),
  tipo_alojamiento: Joi.string().valid('hotel', 'hostal', 'hosteria', 'apart_hotel', 'cabana', 'villa', 'departamento'),
  latitud: opcional(Joi.number().min(-90).max(90)),
  longitud: opcional(Joi.number().min(-180).max(180)),
  telefono: opcional(texto(20)),
  whatsapp: opcional(texto(20)),
  email: opcional(Joi.string().email(EMAIL_OPTS).max(100).lowercase()),
  sitio_web: opcional(texto(200)),
  estrellas: opcional(Joi.number().integer().min(1).max(5)),
  imagen_principal: opcional(texto(500)),
  hora_checkin: Joi.string().pattern(/^\d{2}:\d{2}$/),
  hora_checkout: Joi.string().pattern(/^\d{2}:\d{2}$/),
  politica_cancelacion: Joi.string().valid('flexible', 'moderada', 'estricta'),
  // solo super_admin (el servicio los descarta para otros roles)
  estado: Joi.string().valid('activo', 'inactivo', 'pendiente'),
  comision_porcentaje: Joi.number().min(0).max(100),
  destacado: Joi.boolean(),
};

const crearHotel = Joi.object({
  hotel: Joi.object({ ...camposHotel, nombre: camposHotel.nombre.required() }).required(),
  propietario: Joi.object({
    nombre: texto(100).min(2).required(),
    apellido: texto(100).min(2).required(),
    email: Joi.string().email(EMAIL_OPTS).max(100).lowercase().required(),
    password: Joi.string().min(8).max(100).required(),
  }),
});

const actualizarHotel = Joi.object({ ...camposHotel, regenerar_slug: Joi.boolean() }).min(1);

const amenidadesHotel = Joi.object({ amenidades: Joi.array().items(id).max(80).required() });

/* ---------------- RECURSOS DEL HOTEL ---------------- */
const tipoHabitacion = {
  nombre: texto(100).min(2),
  descripcion: opcional(Joi.string().max(3000)),
  capacidad_maxima: Joi.number().integer().min(1).max(20),
  metros_cuadrados: opcional(Joi.number().min(0).max(999)),
  camas_sencillas: Joi.number().integer().min(0).max(10),
  camas_dobles: Joi.number().integer().min(0).max(10),
  tiene_vista: Joi.boolean(),
  tiene_balcon: Joi.boolean(),
  desayuno_incluido: Joi.boolean(),
  precio_base: Joi.number().min(0).max(100000),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearTipoHabitacion = Joi.object({
  ...tipoHabitacion,
  nombre: tipoHabitacion.nombre.required(),
  capacidad_maxima: tipoHabitacion.capacidad_maxima.required(),
  precio_base: tipoHabitacion.precio_base.required(),
});
const actualizarTipoHabitacion = Joi.object(tipoHabitacion).min(1);

const habitacion = {
  tipo_habitacion_id: id,
  numero_habitacion: texto(10).min(1),
  piso: opcional(Joi.number().integer().min(0).max(100)),
  estado: Joi.string().valid('disponible', 'ocupada', 'mantenimiento', 'limpieza', 'inactiva'),
};
const crearHabitacion = Joi.object({
  ...habitacion,
  tipo_habitacion_id: id.required(),
  numero_habitacion: habitacion.numero_habitacion.required(),
});
const actualizarHabitacion = Joi.object(habitacion).min(1);

const servicio = {
  nombre: texto(100).min(2),
  descripcion: opcional(Joi.string().max(1000)),
  precio: Joi.number().min(0).max(100000),
  tipo: Joi.string().valid('habitacion', 'reserva', 'general'),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearServicio = Joi.object({ ...servicio, nombre: servicio.nombre.required(), precio: servicio.precio.required() });
const actualizarServicio = Joi.object(servicio).min(1);

const temporada = {
  nombre: texto(100).min(2),
  fecha_inicio: fecha,
  fecha_fin: fecha,
  tipo: Joi.string().valid('alta', 'media', 'baja'),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearTemporada = Joi.object({
  ...temporada,
  nombre: temporada.nombre.required(),
  fecha_inicio: temporada.fecha_inicio.required(),
  fecha_fin: temporada.fecha_fin.required(),
});
const actualizarTemporada = Joi.object(temporada).min(1);

const tarifa = {
  tipo_habitacion_id: id,
  temporada_id: id,
  tipo_dia: Joi.string().valid('entre_semana', 'fin_semana', 'feriado'),
  precio: Joi.number().min(0).max(100000),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearTarifa = Joi.object({
  ...tarifa,
  tipo_habitacion_id: id.required(),
  temporada_id: id.required(),
  precio: tarifa.precio.required(),
});
const actualizarTarifa = Joi.object(tarifa).min(1);

const imagen = {
  tipo_habitacion_id: opcional(id),
  url: texto(500).uri({ allowRelative: true }),
  alt: opcional(texto(200)),
  orden: Joi.number().integer().min(0).max(999),
};
const crearImagen = Joi.object({ ...imagen, url: imagen.url.required() });
const actualizarImagen = Joi.object(imagen).min(1);

const configuracion = {
  clave: texto(100).min(1),
  valor: opcional(Joi.string().max(5000)),
  tipo: Joi.string().valid('text', 'number', 'boolean', 'json'),
};
const crearConfiguracion = Joi.object({ ...configuracion, clave: configuracion.clave.required() });
const actualizarConfiguracion = Joi.object(configuracion).min(1);

const bloqueo = {
  habitacion_id: id,
  fecha_inicio: fecha,
  fecha_fin: fecha,
  tipo_bloqueo: Joi.string().valid('mantenimiento', 'limpieza', 'reparacion', 'administrativo', 'otro'),
  motivo: opcional(texto(200)),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearBloqueo = Joi.object({
  ...bloqueo,
  habitacion_id: id.required(),
  fecha_inicio: fecha.required(),
  fecha_fin: fecha.required(),
});
const actualizarBloqueo = Joi.object(bloqueo).min(1);

/* ---------------- PAGOS / CLIENTES / USUARIOS ---------------- */
const registrarPago = Joi.object({
  reserva_id: id.required(),
  monto: Joi.number().positive().max(1000000).required(),
  metodo: Joi.string().valid('efectivo', 'transferencia', 'tarjeta', 'deposito', 'paypal', 'stripe').required(),
  referencia: opcional(texto(100)),
  observaciones: opcional(texto(500)),
});

const crearUsuarioStaff = Joi.object({
  nombre: texto(100).min(2).required(),
  apellido: texto(100).min(2).required(),
  email: Joi.string().email(EMAIL_OPTS).max(100).lowercase().required(),
  password: Joi.string().min(8).max(100).required(),
  rol: Joi.string().pattern(/^[a-z_]{2,30}$/).default('recepcion'), // se valida contra la tabla roles
  hotel_id: id, // solo lo respeta super_admin
});

const zona = {
  nombre: texto(80).min(2),
  descripcion: opcional(Joi.string().max(2000)),
  parroquia: opcional(texto(80)),
  latitud: opcional(Joi.number().min(-90).max(90)),
  longitud: opcional(Joi.number().min(-180).max(180)),
  imagen_url: opcional(texto(500)),
  orden: Joi.number().integer().min(0).max(999),
  estado: Joi.string().valid('activo', 'inactivo'),
};
const crearZona = Joi.object({ ...zona, nombre: zona.nombre.required() });
const actualizarZona = Joi.object(zona).min(1);

/* ---------------- ROLES / MENÚ (plataforma) ---------------- */
const claveRol = Joi.string().pattern(/^[a-z][a-z_]{1,29}$/).message('Usa minúsculas y guion bajo (2 a 30 caracteres)');
const crearRol = Joi.object({
  clave: claveRol.required(),
  nombre: texto(60).min(2).required(),
  descripcion: opcional(texto(255)),
  asignable_por_hotel: Joi.boolean().default(false),
  permisos: Joi.array().items(Joi.string().max(60)).max(100).default([]),
});
const actualizarRol = Joi.object({
  nombre: texto(60).min(2),
  descripcion: opcional(texto(255)),
  asignable_por_hotel: Joi.boolean(),
}).min(1);
const permisosRol = Joi.object({ permisos: Joi.array().items(Joi.string().max(60)).max(100).required() });
const actualizarMenu = Joi.object({
  texto: texto(60).min(2),
  icono: opcional(texto(40)),
  seccion: texto(40).min(2),
  orden: Joi.number().integer().min(0).max(999),
  activo: Joi.boolean(),
  permiso: opcional(Joi.string().max(60)),
}).min(1);

/* ---------------- CANALES (channel manager) ---------------- */
const conectarCanal = Joi.object({ precios_incluyen_impuestos: Joi.boolean().default(true) });
const actualizarConexionCanal = Joi.object({
  estado: Joi.string().valid('activa', 'pausada'),
  precios_incluyen_impuestos: Joi.boolean(),
}).min(1);
const mapeoCanal = Joi.object({ codigo: Joi.string().pattern(/^[A-Za-z0-9_-]{1,40}$/).required() });

module.exports = {
  conectarCanal, actualizarConexionCanal, mapeoCanal,
  crearRol, actualizarRol, permisosRol, actualizarMenu,
  login, register, perfilUpdate, cambiarPassword,
  buscar, disponibilidad, paginacion,
  cotizarReserva, crearReserva, consultaReserva, cancelarReserva, filtrosReservas, actualizarReserva,
  crearValoracion, responderValoracion,
  crearHotel, actualizarHotel, amenidadesHotel,
  crearTipoHabitacion, actualizarTipoHabitacion,
  crearHabitacion, actualizarHabitacion,
  crearServicio, actualizarServicio,
  crearTemporada, actualizarTemporada,
  crearTarifa, actualizarTarifa,
  crearImagen, actualizarImagen,
  crearConfiguracion, actualizarConfiguracion,
  crearBloqueo, actualizarBloqueo,
  registrarPago, crearUsuarioStaff,
  crearZona, actualizarZona,
};
