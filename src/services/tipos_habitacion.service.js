const tiposRepo = require('../repositories/tipos_habitacion.repo');

async function listarTipos(filtros = {}) {
  return tiposRepo.listar(filtros);
}

async function obtenerTipoPorId(id) {
  return tiposRepo.obtenerPorId(id);
}

async function crearTipo(data) {
  // Validación mínima (lo fino lo metemos con validators luego)
  if (!data?.hotel_id || !data?.nombre || !data?.capacidad_maxima || data?.precio_base == null) {
    const err = new Error('hotel_id, nombre, capacidad_maxima y precio_base son obligatorios');
    err.statusCode = 400;
    throw err;
  }
  return tiposRepo.crear(data);
}

async function actualizarTipo(id, data) {
  return tiposRepo.actualizar(id, data);
}

async function eliminarTipo(id) {
  return tiposRepo.eliminar(id);
}

module.exports = {
  listarTipos,
  obtenerTipoPorId,
  crearTipo,
  actualizarTipo,
  eliminarTipo,
};
