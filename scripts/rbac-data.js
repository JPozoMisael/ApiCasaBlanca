/*
| Datos base de roles, permisos y menú lateral. Fuente única: la usan
|   - `src/services/rbac.service.js` (sincroniza la BD al migrar/sembrar) y
|   - `npm run db:sql` (genera database/rbac_mariadb.sql para ejecutar directo en MariaDB).
|
| La sincronización SOLO agrega lo que falta: nunca pisa los permisos que la plataforma
| haya personalizado desde el panel.
*/

// clave, módulo, descripción
const PERMISOS = [
  ['dashboard.ver', 'Resumen', 'Ver el resumen del día (llegadas, salidas, ocupación)'],
  ['reservas.ver', 'Reservas', 'Ver reservas, huéspedes y detalle'],
  ['calendario.ver', 'Reservas', 'Ver el calendario de ocupación por habitación'],
  ['reservas.gestionar', 'Reservas', 'Crear, confirmar, cancelar y registrar check-in / check-out'],
  ['pagos.ver', 'Pagos', 'Ver los cobros registrados'],
  ['pagos.registrar', 'Pagos', 'Registrar cobros de una reserva'],
  ['huespedes.ver', 'Huéspedes', 'Ver el listado de huéspedes'],
  ['habitaciones.ver', 'Habitaciones', 'Ver tipos de habitación y habitaciones'],
  ['habitaciones.estado', 'Habitaciones', 'Cambiar el estado de una habitación (limpieza, ocupada…)'],
  ['habitaciones.gestionar', 'Habitaciones', 'Crear, editar y eliminar tipos de habitación y habitaciones'],
  ['bloqueos.gestionar', 'Habitaciones', 'Bloquear habitaciones por mantenimiento'],
  ['tarifas.gestionar', 'Precios', 'Administrar temporadas y tarifas'],
  ['servicios.gestionar', 'Precios', 'Administrar servicios extra'],
  ['hotel.editar', 'Alojamiento', 'Editar la ficha pública, fotos y servicios del alojamiento'],
  ['resenas.gestionar', 'Alojamiento', 'Ver y responder las opiniones de huéspedes'],
  ['canales.gestionar', 'Alojamiento', 'Conectar y administrar el channel manager (SiteMinder / Little Hotelier)'],
  ['personal.gestionar', 'Personal', 'Crear y activar/desactivar personal del alojamiento'],
  ['reportes.ver', 'Reportes', 'Ver reportes de ocupación e ingresos'],
  ['plataforma.gestionar', 'Plataforma', 'Registrar alojamientos, roles, permisos y menú (solo plataforma)'],
];

// clave, nombre, descripción, alcance, es_sistema, asignable_por_hotel
const ROLES = [
  ['super_admin', 'Plataforma', 'Equipo de la plataforma: todos los alojamientos y toda la configuración', 'plataforma', true, false],
  ['admin', 'Administrador', 'Dueño o gerente de un alojamiento', 'hotel', true, false],
  ['recepcion', 'Recepción', 'Reservas, check-in/out y cobros', 'hotel', true, true],
  ['limpieza', 'Limpieza / mantenimiento', 'Estado de las habitaciones', 'hotel', false, true],
  ['contabilidad', 'Contabilidad', 'Consulta de reservas, cobros y reportes (solo lectura)', 'hotel', false, true],
  ['cliente', 'Huésped', 'Cuenta de huésped: sus reservas, opiniones y favoritos', 'cliente', true, false],
];

// rol → permisos. super_admin recibe TODOS (y además el servidor le da acceso total).
const ROL_PERMISOS = {
  admin: PERMISOS.map((p) => p[0]).filter((c) => !c.startsWith('plataforma.')),
  recepcion: [
    'dashboard.ver', 'calendario.ver', 'reservas.ver', 'reservas.gestionar', 'pagos.ver', 'pagos.registrar',
    'huespedes.ver', 'habitaciones.ver', 'habitaciones.estado', 'bloqueos.gestionar',
  ],
  limpieza: ['habitaciones.ver', 'habitaciones.estado'],
  contabilidad: ['dashboard.ver', 'reservas.ver', 'pagos.ver', 'reportes.ver'],
  cliente: [],
};

// clave, texto, icono (ionicons), ruta, sección, orden, permiso requerido (null = todo el personal)
const MENU = [
  ['resumen', 'Resumen', 'grid-outline', '/admin/dashboard', 'Operación', 10, 'dashboard.ver'],
  ['calendario', 'Calendario', 'calendar-outline', '/admin/calendario', 'Operación', 15, 'calendario.ver'],
  ['reservas', 'Reservas', 'clipboard-outline', '/admin/reservas', 'Operación', 20, 'reservas.ver'],
  ['nueva-reserva', 'Nueva reserva', 'add-circle-outline', '/admin/nueva-reserva', 'Operación', 25, 'reservas.gestionar'],
  ['habitaciones', 'Habitaciones', 'bed-outline', '/admin/habitaciones', 'Operación', 30, 'habitaciones.ver'],
  ['tarifas', 'Tarifas y temporadas', 'pricetag-outline', '/admin/tarifas', 'Precios', 40, 'tarifas.gestionar'],
  ['servicios', 'Servicios extra', 'restaurant-outline', '/admin/servicios', 'Precios', 50, 'servicios.gestionar'],
  ['personal', 'Personal', 'people-outline', '/admin/usuarios', 'Alojamiento', 60, 'personal.gestionar'],
  ['mi-hotel', 'Mi alojamiento', 'storefront-outline', '/admin/mi-hotel', 'Alojamiento', 70, 'hotel.editar'],
  ['canales', 'Canales de venta', 'sync-outline', '/admin/canales', 'Alojamiento', 75, 'canales.gestionar'],
  ['hoteles', 'Alojamientos', 'globe-outline', '/admin/hoteles', 'Plataforma', 80, 'plataforma.gestionar'],
  ['roles', 'Roles y permisos', 'shield-checkmark-outline', '/admin/roles', 'Plataforma', 90, 'plataforma.gestionar'],
];

module.exports = { PERMISOS, ROLES, ROL_PERMISOS, MENU };
