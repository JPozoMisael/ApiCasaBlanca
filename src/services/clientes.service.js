// src/services/clientes.service.js
const clientesRepo = require('../repositories/clientes.repo');

async function listarClientes() {
  return clientesRepo.listar();
}

async function buscarClientes(q) {
  if (!q || q.length < 2) {
    const err = new Error('El texto de búsqueda debe tener al menos 2 caracteres');
    err.statusCode = 400;
    throw err;
  }
  return clientesRepo.buscar(q);
}

async function obtenerClientePorId(id) {
  return clientesRepo.obtenerPorId(id);
}

async function crearCliente(data) {
  // Validación mínima (lo fino lo metemos luego con validators)
  if (!data?.nombre || !data?.apellido) {
    const err = new Error('nombre y apellido son obligatorios');
    err.statusCode = 400;
    throw err;
  }
  return clientesRepo.crear(data);
}

async function actualizarCliente(id, data) {
  return clientesRepo.actualizar(id, data);
}

async function eliminarCliente(id) {
  return clientesRepo.eliminar(id);
}

module.exports = {
  listarClientes,
  buscarClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};
