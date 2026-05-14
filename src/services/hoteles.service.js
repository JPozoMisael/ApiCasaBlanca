const Hotel = require('../models/Hotel');
const { sequelize } = require('../config/db');

/* ======================================================
   CRUD
====================================================== */

async function listarHoteles() {

  return await Hotel.findAll({

    where: {
      estado: 'activo'
    },

    order: [
      ['created_at', 'DESC']
    ]
  });
}

async function obtenerHotelPorId(id) {

  const hotel =
    await Hotel.findByPk(id);

  return hotel || null;
}

async function obtenerPorSlug(slug) {

  const hotel =
    await Hotel.findOne({

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

  const hotel =
    await Hotel.findByPk(id);

  if (!hotel) {
    return null;
  }

  await hotel.update(data);

  return hotel;
}

async function eliminarHotel(id) {

  const hotel =
    await Hotel.findByPk(id);

  if (!hotel) {
    return null;
  }

  await hotel.destroy();

  return true;
}

/* ======================================================
   RESUMEN HOTELES
====================================================== */

async function obtenerResumenHoteles() {

  const [rows] =
    await sequelize.query(`

      SELECT
        h.id,
        h.nombre,
        h.slug,

        h.estrellas AS rating,

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

      INNER JOIN habitaciones hab
        ON hab.hotel_id = h.id

      WHERE
        h.estado = 'activo'
        AND hab.estado = 'disponible'

      GROUP BY
        h.id,
        h.nombre,
        h.slug,
        h.estrellas

      ORDER BY precio_desde ASC

    `);

  return rows;
}

/* ======================================================
   HOTEL DESTACADO
====================================================== */

async function obtenerHotelDestacado() {

  const [rows] =
    await sequelize.query(`

      SELECT
        h.id,
        h.nombre,
        h.slug,

        h.estrellas AS rating,

        COUNT(r.id) AS reservas_semana,

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

      INNER JOIN reservas r
        ON r.hotel_id = h.id

      INNER JOIN habitaciones hab
        ON hab.hotel_id = h.id

      WHERE
        h.estado = 'activo'

        AND r.estado NOT IN (
          'cancelada',
          'no_show'
        )

        AND r.created_at >= DATE_SUB(
          NOW(),
          INTERVAL 7 DAY
        )

      GROUP BY
        h.id,
        h.nombre,
        h.slug,
        h.estrellas

      ORDER BY reservas_semana DESC

      LIMIT 1

    `);

  if (!rows.length) {
    return null;
  }

  return {

    ...rows[0],

    badge:
      'Más reservado esta semana',

    badgeType:
      'success'
  };
}

/* ======================================================
   EXPORTS
====================================================== */

module.exports = {
  listarHoteles,
  obtenerHotelPorId,
  obtenerPorSlug,
  crearHotel,
  actualizarHotel,
  eliminarHotel,
  obtenerResumenHoteles,
  obtenerHotelDestacado
};