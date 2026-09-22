const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/db');
const { models } = require('../models');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { slugify } = require('../utils/codes');
const { validarRango } = require('../utils/dates');
const { redondear } = require('../utils/money');
const { habitacionesLibres } = require('./disponibilidad.service');
const { cargarContexto, cotizarEstadia, precioDesdePorHotel } = require('./precios.service');
const { describirPolitica } = require('./politicas.service');

const esSuperAdmin = (actor) => actor?.alcance === 'plataforma';

/* ======================================================
   PÚBLICO
====================================================== */
async function listarZonas() {
  const zonas = await models.Zona.findAll({
    where: { estado: 'activo' },
    order: [['orden', 'ASC'], ['nombre', 'ASC']],
    raw: true,
  });
  const hoteles = await models.Hotel.findAll({
    where: { estado: 'activo' },
    attributes: ['id', 'zona_id'],
    raw: true,
  });
  const desde = await precioDesdePorHotel(hoteles.map((h) => h.id));

  return zonas.map((z) => {
    const delaZona = hoteles.filter((h) => h.zona_id === z.id);
    const precios = delaZona.map((h) => desde.get(h.id)).filter((p) => p !== undefined);
    return {
      ...z,
      total_hoteles: delaZona.length,
      precio_desde: precios.length ? Math.min(...precios) : null,
    };
  });
}

async function listarAmenidades() {
  return models.Amenidad.findAll({ order: [['categoria', 'ASC'], ['nombre', 'ASC']], raw: true });
}

async function resolverHotelPublico(slugOrId) {
  const esId = /^\d+$/.test(String(slugOrId));
  const hotel = await models.Hotel.findOne({
    where: { ...(esId ? { id: Number(slugOrId) } : { slug: slugOrId }), estado: 'activo' },
  });
  if (!hotel) throw new AppError('Alojamiento no encontrado', 404, 'HOTEL_NO_ENCONTRADO');
  return hotel;
}

async function obtenerFicha(slugOrId) {
  const base = await resolverHotelPublico(slugOrId);

  const [hotel, desde, distribucion] = await Promise.all([
    models.Hotel.findByPk(base.id, {
      include: [
        { model: models.Zona, as: 'zona' },
        { model: models.Amenidad, as: 'amenidades', through: { attributes: [] } },
        { model: models.Imagen, as: 'imagenes', where: { tipo_habitacion_id: null }, required: false },
        {
          model: models.TipoHabitacion,
          as: 'tiposHabitacion',
          where: { estado: 'activo' },
          required: false,
          include: [
            { model: models.Amenidad, as: 'amenidades', through: { attributes: [] } },
            { model: models.Imagen, as: 'imagenes' },
          ],
        },
      ],
      order: [
        [{ model: models.Imagen, as: 'imagenes' }, 'orden', 'ASC'],
        [{ model: models.TipoHabitacion, as: 'tiposHabitacion' }, 'precio_base', 'ASC'],
      ],
    }),
    precioDesdePorHotel(base.id),
    models.Valoracion.findAll({
      where: { hotel_id: base.id, estado: 'publicada' },
      attributes: ['puntuacion', [fn('COUNT', col('id')), 'total']],
      group: ['puntuacion'],
      raw: true,
    }),
  ]);

  const servicios = await models.Servicio.findAll({
    where: { hotel_id: base.id, estado: 'activo' },
    attributes: ['id', 'nombre', 'descripcion', 'precio', 'tipo'],
    raw: true,
  });

  const json = hotel.toJSON();
  json.precio_desde = desde.get(base.id) ?? null;
  json.servicios = servicios;
  json.politica = describirPolitica(hotel.politica_cancelacion);
  json.distribucion_puntuacion = distribucion.map((d) => ({ puntuacion: d.puntuacion, total: Number(d.total) }));
  delete json.comision_porcentaje; // dato interno de la plataforma
  return json;
}

// Tipos de habitación con disponibilidad y precio para unas fechas y un grupo.
async function disponibilidadHotel(slugOrId, { entrada, salida, adultos = 2, ninos = 0 }) {
  const hotel = await resolverHotelPublico(slugOrId);
  const noches = validarRango(entrada, salida, {
    maxNoches: C.MAX_NOCHES,
    maxAnticipacion: C.MAX_DIAS_ANTICIPACION,
  });

  const [libres, tipos, ctx] = await Promise.all([
    habitacionesLibres({ hotelIds: hotel.id, entrada, salida }),
    models.TipoHabitacion.findAll({
      where: { hotel_id: hotel.id, estado: 'activo' },
      include: [
        { model: models.Amenidad, as: 'amenidades', through: { attributes: [] } },
        { model: models.Imagen, as: 'imagenes' },
      ],
      order: [['precio_base', 'ASC']],
    }),
    cargarContexto(hotel.id, entrada, salida),
  ]);

  const huespedes = Number(adultos) + Number(ninos);

  const opciones = tipos.map((tipo) => {
    const plano = tipo.get({ plain: true });
    const disponibles = libres.filter((h) => h.tipo_habitacion_id === tipo.id).length;
    const cotizacion = cotizarEstadia(ctx, plano, entrada, salida);
    return {
      ...plano,
      disponibles,
      cabe_el_grupo: tipo.capacidad_maxima >= huespedes,
      reservable: disponibles > 0 && cotizacion !== null,
      precio_promedio_noche: cotizacion?.promedioNoche ?? null,
      precio_total: cotizacion?.subtotal ?? null,
      precio_por_noche: cotizacion?.porNoche ?? [],
    };
  });

  return {
    hotel: { id: hotel.id, slug: hotel.slug, nombre: hotel.nombre },
    fecha_entrada: entrada,
    fecha_salida: salida,
    noches,
    adultos: Number(adultos),
    ninos: Number(ninos),
    iva_porcentaje: C.IVA_PORCENTAJE,
    habitaciones: opciones,
  };
}

async function destacados(limit = 8) {
  const hoteles = await models.Hotel.findAll({
    where: { estado: 'activo' },
    include: [{ model: models.Zona, as: 'zona', attributes: ['nombre', 'slug'] }],
    order: [['destacado', 'DESC'], ['rating_promedio', 'DESC'], ['id', 'ASC']],
    limit,
  });
  const desde = await precioDesdePorHotel(hoteles.map((h) => h.id));
  return hoteles
    .filter((h) => desde.has(h.id))
    .map((h) => ({
      id: h.id,
      slug: h.slug,
      nombre: h.nombre,
      tipo_alojamiento: h.tipo_alojamiento,
      estrellas: h.estrellas,
      imagen_principal: h.imagen_principal,
      zona: h.zona ? { nombre: h.zona.nombre, slug: h.zona.slug } : null,
      rating: Number(h.rating_promedio),
      total_valoraciones: h.total_valoraciones,
      precio_noche: desde.get(h.id),
      destacado: h.destacado,
    }));
}

/* ======================================================
   GESTIÓN (super_admin / admin del hotel)
====================================================== */
async function slugUnico(nombre, ignorarId = null) {
  const base = slugify(nombre) || 'hotel';
  let slug = base;
  let n = 1;
  // bucle acotado: evita colisiones hotel-2, hotel-3…
  while (
    await models.Hotel.findOne({
      where: { slug, ...(ignorarId ? { id: { [Op.ne]: ignorarId } } : {}) },
      attributes: ['id'],
    })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const CAMPOS_EDITABLES_HOTEL = [
  'nombre', 'descripcion', 'direccion', 'ciudad', 'zona_id', 'tipo_alojamiento',
  'latitud', 'longitud', 'telefono', 'whatsapp', 'email', 'sitio_web', 'estrellas',
  'imagen_principal', 'hora_checkin', 'hora_checkout', 'politica_cancelacion',
];
// Solo la plataforma decide estos campos.
const CAMPOS_SOLO_PLATAFORMA = ['estado', 'comision_porcentaje', 'destacado'];

function filtrarCampos(data, actor) {
  const permitidos = esSuperAdmin(actor) ? [...CAMPOS_EDITABLES_HOTEL, ...CAMPOS_SOLO_PLATAFORMA] : CAMPOS_EDITABLES_HOTEL;
  return Object.fromEntries(Object.entries(data).filter(([k]) => permitidos.includes(k)));
}

// Alta de un alojamiento junto con su usuario administrador (onboarding).
async function crearHotel(data, propietario, actor) {
  if (!esSuperAdmin(actor)) throw new AppError('Solo la plataforma puede registrar hoteles', 403);

  return sequelize.transaction(async (t) => {
    const slug = await slugUnico(data.nombre);
    const hotel = await models.Hotel.create({ ...filtrarCampos(data, actor), slug }, { transaction: t });

    let admin = null;
    if (propietario) {
      const existente = await models.User.findOne({ where: { email: String(propietario.email).toLowerCase() }, transaction: t });
      if (existente) throw new AppError('Ya existe un usuario con ese email', 409, 'EMAIL_DUPLICADO');
      admin = await models.User.create(
        {
          hotel_id: hotel.id,
          nombre: propietario.nombre,
          apellido: propietario.apellido,
          email: propietario.email,
          password: propietario.password,
          rol: 'admin',
        },
        { transaction: t }
      );
    }
    return { hotel, admin: admin ? { id: admin.id, email: admin.email } : null };
  });
}

async function actualizarHotel(id, data, actor) {
  if (!esSuperAdmin(actor) && Number(actor.hotel_id) !== Number(id)) {
    throw new AppError('No puedes editar este hotel', 403, 'FUERA_DE_ALCANCE');
  }
  const hotel = await models.Hotel.findByPk(id);
  if (!hotel) throw new AppError('Hotel no encontrado', 404);
  const cambios = filtrarCampos(data, actor);
  if (cambios.nombre && cambios.nombre !== hotel.nombre && data.regenerar_slug) {
    cambios.slug = await slugUnico(cambios.nombre, hotel.id);
  }
  await hotel.update(cambios);
  return hotel;
}

async function reemplazarAmenidades(hotelId, amenidadIds, actor) {
  if (!esSuperAdmin(actor) && Number(actor.hotel_id) !== Number(hotelId)) {
    throw new AppError('No puedes editar este hotel', 403, 'FUERA_DE_ALCANCE');
  }
  const validas = await models.Amenidad.findAll({ where: { id: { [Op.in]: amenidadIds } }, attributes: ['id'], raw: true });
  await sequelize.transaction(async (t) => {
    await models.HotelAmenidad.destroy({ where: { hotel_id: hotelId }, transaction: t });
    await models.HotelAmenidad.bulkCreate(
      validas.map((a) => ({ hotel_id: hotelId, amenidad_id: a.id })),
      { transaction: t }
    );
  });
  return validas.length;
}

async function recalcularRating(hotelId, transaction) {
  const r = await models.Valoracion.findOne({
    where: { hotel_id: hotelId, estado: 'publicada' },
    attributes: [[fn('AVG', col('puntuacion')), 'promedio'], [fn('COUNT', col('id')), 'total']],
    raw: true,
    transaction,
  });
  await models.Hotel.update(
    { rating_promedio: redondear(Number(r.promedio) || 0, 1), total_valoraciones: Number(r.total) || 0 },
    { where: { id: hotelId }, transaction }
  );
}

// Listado interno (incluye hoteles inactivos/pendientes) para el panel de la plataforma.
async function listarParaPlataforma({ estado, texto, page = 1, limit = 20 } = {}) {
  const where = {};
  if (estado) where.estado = estado;
  if (texto) where.nombre = { [Op.like]: `%${texto}%` };
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const { rows, count } = await models.Hotel.findAndCountAll({
    where,
    include: [{ model: models.Zona, as: 'zona', attributes: ['nombre', 'slug'] }],
    order: [['id', 'DESC']],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });
  return { data: rows, meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) } };
}

module.exports = {
  listarZonas,
  listarAmenidades,
  obtenerFicha,
  disponibilidadHotel,
  destacados,
  crearHotel,
  actualizarHotel,
  reemplazarAmenidades,
  recalcularRating,
  listarParaPlataforma,
  slugUnico,
};
