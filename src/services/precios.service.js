const { Op } = require('sequelize');
const { models } = require('../models');
const { nochesDelRango, diaSemana } = require('../utils/dates');
const { redondear } = require('../utils/money');
const canales = require('./canales.service');

/*
| Resolución de precio por noche:
|   1. Tarifa (tipo de habitación × temporada × tipo de día) si el hotel la configuró.
|   2. Si falta la del fin de semana, se usa la de entre semana de esa temporada.
|   3. Si no hay temporada/tarifa, se usa el precio_base del tipo de habitación.
| Así un hotel recién registrado ya es reservable con solo definir precio_base.
| Las noches de viernes y sábado se consideran "fin de semana".
*/

const tipoDia = (fecha) => ([5, 6].includes(diaSemana(fecha)) ? 'fin_semana' : 'entre_semana');

// Carga en 2 consultas todo lo necesario para cotizar cualquier hotel/tipo del rango.
async function cargarContexto(hotelIds, entrada, salida) {
  const ids = [].concat(hotelIds);

  const [temporadas, tarifas] = await Promise.all([
    models.Temporada.findAll({
      where: {
        hotel_id: { [Op.in]: ids },
        estado: 'activo',
        fecha_inicio: { [Op.lt]: salida },
        fecha_fin: { [Op.gte]: entrada },
      },
      raw: true,
    }),
    models.TarifaHabitacion.findAll({
      where: { hotel_id: { [Op.in]: ids }, estado: 'activo' },
      raw: true,
    }),
  ]);

  const temporadasPorHotel = new Map();
  for (const t of temporadas) {
    if (!temporadasPorHotel.has(t.hotel_id)) temporadasPorHotel.set(t.hotel_id, []);
    temporadasPorHotel.get(t.hotel_id).push(t);
  }

  const tarifaPorClave = new Map();
  for (const t of tarifas) {
    tarifaPorClave.set(`${t.tipo_habitacion_id}|${t.temporada_id}|${t.tipo_dia}`, Number(t.precio));
  }

  // Tarifas del channel manager para los tipos conectados (reemplazan a las locales).
  const { tiposCanal, precios: preciosCanal } = await canales.cargarPreciosCanal(ids, entrada, salida);

  return { temporadasPorHotel, tarifaPorClave, tiposCanal, preciosCanal };
}

function temporadaDe(ctx, hotelId, fecha) {
  const candidatas = (ctx.temporadasPorHotel.get(hotelId) || []).filter(
    (t) => String(t.fecha_inicio) <= fecha && String(t.fecha_fin) >= fecha
  );
  // la más específica = la que empezó más tarde; a igual inicio, la más corta
  candidatas.sort(
    (a, b) =>
      String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)) ||
      String(a.fecha_fin).localeCompare(String(b.fecha_fin))
  );
  return candidatas[0] || null;
}

// tipo: { id, hotel_id, precio_base }
function precioNoche(ctx, tipo, fecha) {
  // Tipo conectado a un channel manager: solo vale la tarifa que él envió (sin ella, la noche no se vende).
  if (ctx.tiposCanal?.has(tipo.id)) {
    const p = ctx.preciosCanal.get(`${tipo.id}|${fecha}`);
    return p === undefined ? null : { precio: p, temporada: 'canal' };
  }
  const temporada = temporadaDe(ctx, tipo.hotel_id, fecha);
  if (temporada) {
    const dia = tipoDia(fecha);
    const p =
      ctx.tarifaPorClave.get(`${tipo.id}|${temporada.id}|${dia}`) ??
      ctx.tarifaPorClave.get(`${tipo.id}|${temporada.id}|entre_semana`);
    if (p !== undefined) return { precio: p, temporada: temporada.nombre };
  }
  const base = Number(tipo.precio_base);
  if (base > 0) return { precio: base, temporada: null };
  return null;
}

// Devuelve null si alguna noche no tiene precio (tipo sin tarifa ni precio_base).
function cotizarEstadia(ctx, tipo, entrada, salida) {
  const noches = nochesDelRango(entrada, salida);
  const porNoche = [];
  for (const fecha of noches) {
    const r = precioNoche(ctx, tipo, fecha);
    if (!r) return null;
    porNoche.push({ fecha, precio: redondear(r.precio), temporada: r.temporada });
  }
  const subtotal = redondear(porNoche.reduce((s, n) => s + n.precio, 0));
  return {
    noches: noches.length,
    porNoche,
    subtotal,
    promedioNoche: redondear(subtotal / noches.length),
  };
}

// Precio "desde" sin fechas: el menor entre precio_base y las tarifas activas.
async function precioDesdePorHotel(hotelIds) {
  const ids = [].concat(hotelIds);
  const [tipos, tarifas] = await Promise.all([
    models.TipoHabitacion.findAll({
      where: { hotel_id: { [Op.in]: ids }, estado: 'activo' },
      attributes: ['id', 'hotel_id', 'precio_base'],
      raw: true,
    }),
    models.TarifaHabitacion.findAll({
      where: { hotel_id: { [Op.in]: ids }, estado: 'activo' },
      attributes: ['tipo_habitacion_id', 'precio'],
      raw: true,
    }),
  ]);

  const minPorTipo = new Map();
  for (const t of tipos) if (Number(t.precio_base) > 0) minPorTipo.set(t.id, Number(t.precio_base));
  for (const t of tarifas) {
    const p = Number(t.precio);
    const actual = minPorTipo.get(t.tipo_habitacion_id);
    if (p > 0 && (actual === undefined || p < actual)) minPorTipo.set(t.tipo_habitacion_id, p);
  }

  // Los tipos conectados usan la tarifa más baja que envió el channel manager (o ninguna si no hay).
  const delCanal = await canales.precioDesdeCanal(ids);
  for (const [tipoId, precio] of delCanal) {
    if (precio === null) minPorTipo.delete(tipoId);
    else minPorTipo.set(tipoId, precio);
  }

  const out = new Map();
  for (const t of tipos) {
    const p = minPorTipo.get(t.id);
    if (p === undefined) continue;
    if (!out.has(t.hotel_id) || p < out.get(t.hotel_id)) out.set(t.hotel_id, p);
  }
  return out;
}

module.exports = { cargarContexto, precioNoche, cotizarEstadia, precioDesdePorHotel, tipoDia };
