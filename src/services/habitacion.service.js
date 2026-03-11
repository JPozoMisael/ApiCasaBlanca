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

module.exports = {
  listarHabitaciones,
  obtenerHabitacionPorId,
  crearHabitacion,
  actualizarHabitacion,
  eliminarHabitacion,
};
