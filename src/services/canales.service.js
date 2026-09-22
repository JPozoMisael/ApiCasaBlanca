const { Op } = require('sequelize');
const { models } = require('../models');
const { AppError } = require('../utils/errors');
const { hoyISO, nochesDelRango } = require('../utils/dates');

/*
| Canales (channel manager). Para los hoteles conectados, la disponibilidad, las tarifas y las
| restricciones de los tipos de habitación MAPEADOS las manda el channel manager y son la fuente de verdad;
| el inventario propio solo actúa como tope adicional (nunca se vende más de lo que el hotel tiene registrado aquí).
*/

const ESTADOS_CON_INVENTARIO = ['activa', 'pausada'];

const codigoHotelDe = (hotelId) => `SB${String(hotelId).padStart(5, '0')}`;

/* ======================================================
   GESTIÓN DE LA CONEXIÓN
====================================================== */
async function sincronizarMapeos(conexion) {
  const tipos = await models.TipoHabitacion.findAll({
    where: { hotel_id: conexion.hotel_id, estado: 'activo' },
    attributes: ['id'],
    raw: true,
  });
  const existentes = new Set((await models.CanalMapeo.findAll({ where: { conexion_id: conexion.id }, raw: true })).map((m) => m.tipo_habitacion_id));
  for (const t of tipos) {
    if (!existentes.has(t.id)) {
      await models.CanalMapeo.create({ conexion_id: conexion.id, tipo_habitacion_id: t.id, codigo_habitacion: `TIPO${t.id}` });
    }
  }
}

async function conectar(hotelId, { precios_incluyen_impuestos = true } = {}) {
  const existente = await models.CanalConexion.findOne({ where: { hotel_id: hotelId, proveedor: 'siteminder' } });
  if (existente) throw new AppError('Este alojamiento ya tiene una conexión con SiteMinder', 409, 'YA_CONECTADO');

  const conexion = await models.CanalConexion.create({
    hotel_id: hotelId,
    proveedor: 'siteminder',
    codigo_hotel: codigoHotelDe(hotelId),
    precios_incluyen_impuestos,
  });
  await sincronizarMapeos(conexion);
  return obtener(hotelId);
}

async function obtener(hotelId) {
  const conexion = await models.CanalConexion.findOne({
    where: { hotel_id: hotelId, proveedor: 'siteminder' },
    include: [{ model: models.CanalMapeo, as: 'mapeos', include: [{ model: models.TipoHabitacion, as: 'tipoHabitacion', attributes: ['id', 'nombre', 'estado'] }] }],
  });
  if (!conexion) return null;

  const hoy = hoyISO();
  const [fechasCargadas, pendientes, conError] = await Promise.all([
    models.CanalInventario.count({ where: { conexion_id: conexion.id, fecha: { [Op.gte]: hoy } } }),
    models.CanalSalida.count({ where: { conexion_id: conexion.id, estado: 'pendiente' } }),
    models.CanalSalida.count({ where: { conexion_id: conexion.id, estado: 'error' } }),
  ]);

  return { ...conexion.toJSON(), resumen: { fechas_cargadas: fechasCargadas, salidas_pendientes: pendientes, salidas_con_error: conError } };
}

async function actualizar(hotelId, datos) {
  const conexion = await models.CanalConexion.findOne({ where: { hotel_id: hotelId, proveedor: 'siteminder' } });
  if (!conexion) throw new AppError('Este alojamiento no tiene conexión con SiteMinder', 404);
  if (datos.estado === 'activa' && !conexion.ultima_entrada_en) {
    throw new AppError('Aún no llegó disponibilidad desde SiteMinder: la conexión se activa sola con el primer envío', 409, 'SIN_DATOS');
  }
  await conexion.update(datos);
  return obtener(hotelId);
}

async function editarMapeo(hotelId, mapeoId, codigo) {
  const mapeo = await models.CanalMapeo.findByPk(mapeoId, { include: [{ model: models.CanalConexion, as: 'conexion' }] });
  if (!mapeo || mapeo.conexion.hotel_id !== hotelId) throw new AppError('Mapeo no encontrado', 404);
  await mapeo.update({ codigo_habitacion: codigo });
  return mapeo;
}

/* ======================================================
   INVENTARIO QUE MANDA EL CHANNEL MANAGER
====================================================== */
async function conexionesConInventario(hotelIds, transaction) {
  const conexiones = await models.CanalConexion.findAll({
    where: { hotel_id: { [Op.in]: [].concat(hotelIds) }, estado: { [Op.in]: ESTADOS_CON_INVENTARIO } },
    raw: true,
    transaction,
  });
  if (!conexiones.length) return { conexiones: [], mapeos: [] };
  const mapeos = await models.CanalMapeo.findAll({
    where: { conexion_id: { [Op.in]: conexiones.map((c) => c.id) } },
    raw: true,
    transaction,
  });
  return { conexiones, mapeos };
}

// Cuántas unidades de un tipo se pueden vender en [entrada, salida) según el channel manager.
function permitidoPorTipo({ conexion, filas, entrada, salida }) {
  if (conexion.estado === 'pausada') return 0;
  const noches = nochesDelRango(entrada, salida);
  const porFecha = new Map(filas.map((f) => [f.fecha, f]));

  let minimo = Infinity;
  for (const fecha of noches) {
    const f = porFecha.get(fecha);
    if (!f || f.cerrado || f.disponibles === null) return 0; // sin datos o con stop sell → no se vende
    minimo = Math.min(minimo, Math.max(0, f.disponibles - f.vendidas_local));
  }

  const llegada = porFecha.get(noches[0]);
  if (llegada.cerrado_llegada) return 0;
  if (llegada.min_estancia && noches.length < llegada.min_estancia) return 0;
  if (llegada.max_estancia && noches.length > llegada.max_estancia) return 0;
  if (porFecha.get(salida)?.cerrado_salida) return 0;

  return Number.isFinite(minimo) ? minimo : 0;
}

/**
 * Recorta la lista de habitaciones libres según lo que permite el channel manager.
 * Los tipos que no están mapeados siguen vendiéndose con el inventario propio.
 */
async function aplicarCanal({ libres, hotelIds, entrada, salida, transaction }) {
  const { conexiones, mapeos } = await conexionesConInventario(hotelIds, transaction);
  if (!conexiones.length) return libres;

  const filas = await models.CanalInventario.findAll({
    where: { conexion_id: { [Op.in]: conexiones.map((c) => c.id) }, fecha: { [Op.gte]: entrada, [Op.lte]: salida } },
    raw: true,
    transaction,
  });

  const restringidos = new Map(); // tipo_id → cupo permitido
  for (const m of mapeos) {
    const conexion = conexiones.find((c) => c.id === m.conexion_id);
    const delTipo = filas.filter((f) => f.tipo_habitacion_id === m.tipo_habitacion_id);
    restringidos.set(m.tipo_habitacion_id, permitidoPorTipo({ conexion, filas: delTipo, entrada, salida }));
  }
  if (!restringidos.size) return libres;

  const usados = new Map();
  return libres.filter((h) => {
    if (!restringidos.has(h.tipo_habitacion_id)) return true;
    const n = (usados.get(h.tipo_habitacion_id) || 0) + 1;
    usados.set(h.tipo_habitacion_id, n);
    return n <= restringidos.get(h.tipo_habitacion_id);
  });
}

// Tarifas por noche del channel manager para el contexto de precios.
async function cargarPreciosCanal(hotelIds, entrada, salida) {
  const { conexiones, mapeos } = await conexionesConInventario(hotelIds);
  const tiposCanal = new Set(mapeos.map((m) => m.tipo_habitacion_id));
  const precios = new Map();
  if (tiposCanal.size) {
    const filas = await models.CanalInventario.findAll({
      where: { conexion_id: { [Op.in]: conexiones.map((c) => c.id) }, fecha: { [Op.gte]: entrada, [Op.lt]: salida } },
      attributes: ['tipo_habitacion_id', 'fecha', 'precio'],
      raw: true,
    });
    for (const f of filas) if (f.precio !== null) precios.set(`${f.tipo_habitacion_id}|${f.fecha}`, Number(f.precio));
  }
  return { tiposCanal, precios };
}

// Precio "desde" de los tipos mapeados: la tarifa futura más baja que envió el channel manager.
async function precioDesdeCanal(hotelIds) {
  const { conexiones, mapeos } = await conexionesConInventario(hotelIds);
  const activos = mapeos.filter((m) => conexiones.find((c) => c.id === m.conexion_id)?.estado === 'activa');
  const resultado = new Map(activos.map((m) => [m.tipo_habitacion_id, null]));
  if (!activos.length) return resultado;

  const filas = await models.CanalInventario.findAll({
    where: { tipo_habitacion_id: { [Op.in]: activos.map((m) => m.tipo_habitacion_id) }, fecha: { [Op.gte]: hoyISO() }, precio: { [Op.ne]: null }, cerrado: false },
    attributes: ['tipo_habitacion_id', 'precio'],
    raw: true,
  });
  for (const f of filas) {
    const p = Number(f.precio);
    const actual = resultado.get(f.tipo_habitacion_id);
    if (actual === null || p < actual) resultado.set(f.tipo_habitacion_id, p);
  }
  return resultado;
}

/**
 * Registra (delta = +1) o libera (delta = -1) una venta hecha aquí, hasta que el channel manager
 * confirme la nueva disponibilidad con su siguiente envío.
 */
async function ajustarVentaLocal({ tipoIds, entrada, salida, delta, transaction }) {
  if (!tipoIds.length) return;
  const noches = nochesDelRango(entrada, salida);
  for (const tipoId of tipoIds) {
    const filas = await models.CanalInventario.findAll({
      where: { tipo_habitacion_id: tipoId, fecha: { [Op.in]: noches } },
      transaction,
    });
    for (const f of filas) {
      await f.update({ vendidas_local: Math.max(0, f.vendidas_local + delta) }, { transaction });
    }
  }
}

module.exports = {
  codigoHotelDe,
  conectar,
  obtener,
  actualizar,
  editarMapeo,
  sincronizarMapeos,
  aplicarCanal,
  cargarPreciosCanal,
  precioDesdeCanal,
  ajustarVentaLocal,
  permitidoPorTipo,
};
