const { models } = require('../models');

async function dashboard() {
  const [totalReservas, totalClientes, totalHabitaciones, ingresosTotales] =
    await Promise.all([
      models.Reserva.count(),
      models.Cliente.count(),
      models.Habitacion.count(),
      models.Pago.sum('monto'),
    ]);

  return {
    totalReservas,
    totalClientes,
    totalHabitaciones,
    ingresosTotales: Number(ingresosTotales || 0),
  };
}

async function listarUsuarios() {
  return models.User.findAll({ order: [['id', 'DESC']] });
}

async function crearUsuario(data) {
  return models.User.create(data);
}

async function cambiarRol(id, rol) {
  const user = await models.User.findByPk(id);
  if (!user) return null;
  return user.update({ rol });
}

module.exports = { dashboard, listarUsuarios, crearUsuario, cambiarRol };
