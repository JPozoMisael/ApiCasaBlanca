const habitacionesRepo = require('../repositories/habitaciones.repo');

async function listarHabitaciones(filtros = {}) {
  return habitacionesRepo.listar(filtros);
}

async function obtenerHabitacionPorId(id) {
  return habitacionesRepo.obtenerPorId(id);
}

async function crearHabitacion(data) {
  // Validación mínima para no romper BD
  if (!data?.hotel_id || !data?.tipo_habitacion_id || !data?.numero_habitacion) {
    const err = new Error('hotel_id, tipo_habitacion_id y numero_habitacion son obligatorios');
    err.statusCode = 400;
    throw err;
  }
  return habitacionesRepo.crear(data);
}

async function actualizarHabitacion(id, data) {
  return habitacionesRepo.actualizar(id, data);
}

async function eliminarHabitacion(id) {
  return habitacionesRepo.eliminar(id);
}
/* ======================================================
   HABITACIONES DESTACADAS
====================================================== */

async function obtenerHabitacionesDestacadas() {

  const [rows] = await sequelize.query(`

    SELECT
      hab.id,

      hab.numero_habitacion,

      hab.precio_noche,

      hab.imagen_url AS imagen,

      th.nombre AS tipo_habitacion,

      h.nombre AS hotel_nombre,
      h.slug,

      h.estrellas AS rating,

      COUNT(dr.id) AS total_reservas

    FROM detalle_reservas dr

    INNER JOIN habitaciones hab
      ON hab.id = dr.habitacion_id

    INNER JOIN hoteles h
      ON h.id = hab.hotel_id

    INNER JOIN tipo_habitaciones th
      ON th.id = hab.tipo_habitacion_id

    INNER JOIN reservas r
      ON r.id = dr.reserva_id

    WHERE
      r.estado NOT IN (
        'cancelada',
        'no_show'
      )

      AND hab.estado = 'disponible'

    GROUP BY
      hab.id,
      hab.numero_habitacion,
      hab.precio_noche,
      hab.imagen_url,
      th.nombre,
      h.nombre,
      h.slug,
      h.estrellas

    ORDER BY total_reservas DESC

    LIMIT 6

  `);

  return rows;
}

module.exports = {
  listarHabitaciones,
  obtenerHabitacionPorId,
  crearHabitacion,
  actualizarHabitacion,
  eliminarHabitacion,
  obtenerHabitacionesDestacadas
};
