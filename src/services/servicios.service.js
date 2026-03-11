// src/services/servicios.service.js
const serviciosRepo = require('../repositories/servicios.repo');

async function listarServicios(filtros = {}) {
  return serviciosRepo.listar(filtros);
}

async function obtenerServicioPorId(id) {
  return serviciosRepo.obtenerPorId(id);
}

async function crearServicio(data) {
  // Validación mínima para no romper BD
  if (!data?.hotel_id || !data?.nombre || data?.precio == null) {
    const err = new Error('hotel_id, nombre y precio son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  // Normalizaciones suaves
  if (typeof data.esta_activo === 'undefined') data.esta_activo = true;
  if (!data.tipo) data.tipo = 'reserva';

  return serviciosRepo.crear(data);
}

async function actualizarServicio(id, data) {
  return serviciosRepo.actualizar(id, data);
}

async function eliminarServicio(id) {
  return serviciosRepo.eliminar(id);
}

module.exports = {
  listarServicios,
  obtenerServicioPorId,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
