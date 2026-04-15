// src/services/hoteles.service.js

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
      MIN(hab.precio_noche) AS precio_desde,
      COALESCE(
        MAX(
          CASE 
            WHEN hab.imagen_url IS NOT NULL 
             AND hab.imagen_url <> '' 
            THEN hab.imagen_url 
          END
        ),
        ''
      ) AS imagen
    FROM hoteles h
    JOIN habitaciones hab ON hab.hotel_id = h.id
    WHERE h.estado = 'activo'
      AND hab.estado = 'disponible'
    GROUP BY h.id, h.nombre, h.slug
    ORDER BY precio_desde ASC
  `);

  return rows;
}

module.exports = {
  listarHoteles,
  obtenerHotelPorId,
  crearHotel,
  actualizarHotel,
  eliminarHotel,
  obtenerResumenHoteles, 
};