const Hotel = require('../models/Hotel');
const { sequelize } = require('../config/db');

/* ================= CRUD ================= */

async function listarHoteles() {
  return await Hotel.findAll({
    where: { estado: 'activo' },
    order: [['created_at', 'DESC']],
  });
}

async function obtenerHotelPorId(id) {
  const hotel = await Hotel.findByPk(id);
  return hotel || null;
}

async function obtenerPorSlug(slug) {
  const hotel = await Hotel.findOne({
    where: {
      slug,
      estado: 'activo'
    }
  });

  return hotel || null;
}

async function crearHotel(data) {
  return await Hotel.create(data);
}

async function actualizarHotel(id, data) {
  const hotel = await Hotel.findByPk(id);
  if (!hotel) return null;

  await hotel.update(data);
  return hotel;
}

async function eliminarHotel(id) {
  const hotel = await Hotel.findByPk(id);
  if (!hotel) return null;

  await hotel.destroy();
  return true;
}

/* ================= RESUMEN (BOOKING STYLE) ================= */

async function obtenerResumenHoteles() {

  const [rows] = await sequelize.query(`
    SELECT 
      h.id,
      h.nombre,
      h.slug,
      COALESCE(MIN(hab.precio_noche), 0) AS precio_desde,

      COALESCE(
        MAX(
          CASE 
            WHEN hab.imagen_url IS NOT NULL 
             AND hab.imagen_url <> '' 
            THEN hab.imagen_url 
          END
        ),
        'assets/img/default.jpg'
      ) AS imagen

    FROM hoteles h
    LEFT JOIN habitaciones hab 
      ON hab.hotel_id = h.id

    WHERE h.estado = 'activo'

    GROUP BY h.id, h.nombre, h.slug

    ORDER BY precio_desde ASC
  `);

  return rows;
}

/* ================= EXPORT ================= */

module.exports = {
  listarHoteles,
  obtenerHotelPorId,
  obtenerPorSlug, 
  crearHotel,
  actualizarHotel,
  eliminarHotel,
  obtenerResumenHoteles,
};