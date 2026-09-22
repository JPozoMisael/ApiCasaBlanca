const { Op } = require('sequelize');
const { models } = require('../models');
const { validarRango } = require('../utils/dates');
const { redondear } = require('../utils/money');
const { habitacionesLibres } = require('./disponibilidad.service');
const { cargarContexto, cotizarEstadia, precioDesdePorHotel } = require('./precios.service');

/*
| Buscador global de alojamientos (equivalente a la pantalla de resultados de Booking).
| Con fechas: solo devuelve hoteles con disponibilidad real para el grupo, con el precio de la estadía.
| Sin fechas: devuelve el catálogo con precio "desde".
*/

const ORDENES = ['recomendado', 'precio_asc', 'precio_desc', 'rating', 'estrellas'];

const contar = (items, keyFn) => {
  const mapa = new Map();
  for (const it of items) {
    const claves = [].concat(keyFn(it)).filter((k) => k !== null && k !== undefined);
    for (const k of claves) mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  return [...mapa.entries()].map(([valor, total]) => ({ valor, total }));
};

// Elige la combinación más barata de `n` habitaciones libres donde cada una aloje `minCapacidad`.
function elegirMejorCombinacion(opciones, n) {
  const pool = [];
  for (const op of opciones) for (let i = 0; i < op.libres; i += 1) pool.push(op);
  if (pool.length < n) return null;
  pool.sort((a, b) => a.cotizacion.subtotal - b.cotizacion.subtotal);
  return pool.slice(0, n);
}

async function buscarHoteles(params = {}) {
  const {
    zona,
    texto,
    entrada,
    salida,
    adultos = 2,
    ninos = 0,
    habitaciones = 1,
    precioMin,
    precioMax,
    estrellasMin,
    ratingMin,
    tipos = [],
    amenidades = [],
    orden = 'recomendado',
    page = 1,
    limit = 12,
  } = params;

  const conFechas = Boolean(entrada && salida);
  const noches = conFechas ? validarRango(entrada, salida) : null;
  const huespedes = Number(adultos) + Number(ninos);
  const nHabitaciones = Math.max(1, Number(habitaciones) || 1);
  const minCapacidad = Math.ceil(huespedes / nHabitaciones);

  // ---------- 1. Filtros del catálogo ----------
  const where = { estado: 'activo' };
  if (zona) {
    const z = await models.Zona.findOne({ where: { slug: zona }, attributes: ['id'], raw: true });
    if (!z) return respuestaVacia({ page, limit, noches });
    where.zona_id = z.id;
  }
  if (tipos.length) where.tipo_alojamiento = { [Op.in]: tipos };
  if (estrellasMin) where.estrellas = { [Op.gte]: Number(estrellasMin) };
  if (ratingMin) where.rating_promedio = { [Op.gte]: Number(ratingMin) };
  if (texto) {
    const like = { [Op.like]: `%${String(texto).trim()}%` };
    where[Op.or] = [{ nombre: like }, { direccion: like }, { descripcion: like }];
  }

  let hoteles = await models.Hotel.findAll({
    where,
    include: [
      { model: models.Zona, as: 'zona', attributes: ['id', 'nombre', 'slug'] },
      {
        model: models.Amenidad,
        as: 'amenidades',
        attributes: ['id', 'nombre', 'slug', 'icono'],
        through: { attributes: [] },
      },
    ],
  });

  if (amenidades.length) {
    hoteles = hoteles.filter((h) => {
      const slugs = new Set(h.amenidades.map((a) => a.slug));
      return amenidades.every((a) => slugs.has(a));
    });
  }
  if (!hoteles.length) return respuestaVacia({ page, limit, noches });

  const ids = hoteles.map((h) => h.id);

  // ---------- 2. Precio / disponibilidad ----------
  const info = new Map(); // hotel_id -> datos de precio

  if (conFechas) {
    const [libres, tiposRows, ctx] = await Promise.all([
      habitacionesLibres({ hotelIds: ids, entrada, salida }),
      models.TipoHabitacion.findAll({
        where: { hotel_id: { [Op.in]: ids }, estado: 'activo' },
        raw: true,
      }),
      cargarContexto(ids, entrada, salida),
    ]);

    const libresPorHotelTipo = new Map();
    for (const h of libres) {
      const k = `${h.hotel_id}|${h.tipo_habitacion_id}`;
      libresPorHotelTipo.set(k, (libresPorHotelTipo.get(k) || 0) + 1);
    }

    for (const hotel of hoteles) {
      const opciones = [];
      for (const tipo of tiposRows.filter((t) => t.hotel_id === hotel.id)) {
        const libresTipo = libresPorHotelTipo.get(`${hotel.id}|${tipo.id}`) || 0;
        if (!libresTipo || tipo.capacidad_maxima < minCapacidad) continue;
        const cotizacion = cotizarEstadia(ctx, tipo, entrada, salida);
        if (!cotizacion) continue;
        opciones.push({ tipo, libres: libresTipo, cotizacion });
      }

      const mejor = elegirMejorCombinacion(opciones, nHabitaciones);
      if (!mejor) continue;

      const total = redondear(mejor.reduce((s, o) => s + o.cotizacion.subtotal, 0));
      info.set(hotel.id, {
        precio_total: total,
        precio_noche: redondear(total / nHabitaciones / noches),
        habitaciones_disponibles: opciones.reduce((s, o) => s + o.libres, 0),
        tipo_sugerido: { id: mejor[0].tipo.id, nombre: mejor[0].tipo.nombre },
      });
    }
  } else {
    const desde = await precioDesdePorHotel(ids);
    for (const hotel of hoteles) {
      if (desde.has(hotel.id)) info.set(hotel.id, { precio_noche: desde.get(hotel.id) });
    }
  }

  let resultados = hoteles.filter((h) => info.has(h.id));

  // Facets calculados antes del filtro de precio, para que el usuario vea cuántos hay en cada opción.
  const precios = resultados.map((h) => info.get(h.id).precio_noche);
  const facets = {
    zonas: contar(resultados, (h) => h.zona?.slug).map((f) => ({
      ...f,
      nombre: resultados.find((h) => h.zona?.slug === f.valor)?.zona?.nombre,
    })),
    tipos: contar(resultados, (h) => h.tipo_alojamiento),
    estrellas: contar(resultados, (h) => h.estrellas),
    amenidades: contar(resultados, (h) => h.amenidades.map((a) => a.slug)),
    precio: {
      min: precios.length ? Math.floor(Math.min(...precios)) : 0,
      max: precios.length ? Math.ceil(Math.max(...precios)) : 0,
    },
  };

  if (precioMin !== undefined && precioMin !== null && precioMin !== '') {
    resultados = resultados.filter((h) => info.get(h.id).precio_noche >= Number(precioMin));
  }
  if (precioMax !== undefined && precioMax !== null && precioMax !== '') {
    resultados = resultados.filter((h) => info.get(h.id).precio_noche <= Number(precioMax));
  }

  // ---------- 3. Orden ----------
  const ordenFinal = ORDENES.includes(orden) ? orden : 'recomendado';
  const puntaje = (h) =>
    (h.destacado ? 20 : 0) +
    Number(h.rating_promedio) * 3 +
    (h.estrellas || 0) * 2 +
    Math.min(Math.log10(1 + h.total_valoraciones) * 4, 8);

  const cmp = {
    recomendado: (a, b) => puntaje(b) - puntaje(a),
    precio_asc: (a, b) => info.get(a.id).precio_noche - info.get(b.id).precio_noche,
    precio_desc: (a, b) => info.get(b.id).precio_noche - info.get(a.id).precio_noche,
    rating: (a, b) => Number(b.rating_promedio) - Number(a.rating_promedio),
    estrellas: (a, b) => (b.estrellas || 0) - (a.estrellas || 0),
  }[ordenFinal];
  resultados.sort((a, b) => cmp(a, b) || a.id - b.id);

  // ---------- 4. Paginación ----------
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
  const total = resultados.length;
  const pagina = resultados.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    data: pagina.map((h) => serializarResultado(h, info.get(h.id), { conFechas })),
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      noches,
      orden: ordenFinal,
    },
    facets,
  };
}

function serializarResultado(h, datos, { conFechas }) {
  return {
    id: h.id,
    slug: h.slug,
    nombre: h.nombre,
    tipo_alojamiento: h.tipo_alojamiento,
    estrellas: h.estrellas,
    direccion: h.direccion,
    latitud: h.latitud !== null ? Number(h.latitud) : null,
    longitud: h.longitud !== null ? Number(h.longitud) : null,
    imagen_principal: h.imagen_principal,
    zona: h.zona ? { nombre: h.zona.nombre, slug: h.zona.slug } : null,
    rating: Number(h.rating_promedio),
    total_valoraciones: h.total_valoraciones,
    destacado: h.destacado,
    politica_cancelacion: h.politica_cancelacion,
    amenidades: h.amenidades.slice(0, 6).map((a) => ({ slug: a.slug, nombre: a.nombre, icono: a.icono })),
    precio_noche: datos.precio_noche,
    ...(conFechas
      ? {
          precio_total: datos.precio_total,
          habitaciones_disponibles: datos.habitaciones_disponibles,
          tipo_sugerido: datos.tipo_sugerido,
        }
      : {}),
  };
}

function respuestaVacia({ page, limit, noches }) {
  return {
    data: [],
    meta: { total: 0, page: Number(page) || 1, limit: Number(limit) || 12, pages: 0, noches },
    facets: { zonas: [], tipos: [], estrellas: [], amenidades: [], precio: { min: 0, max: 0 } },
  };
}

module.exports = { buscarHoteles, ORDENES };
