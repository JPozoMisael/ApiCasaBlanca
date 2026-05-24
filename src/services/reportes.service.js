const { models } = require('../models');
const { Op } = require('sequelize');

// =============================================
// DASHBOARD PRINCIPAL
// =============================================
async function getDashboard() {
  const [totalHoteles, totalReservas, totalClientes, totalHabitaciones, totalPagos] = await Promise.all([
    models.Hotel.count(),
    models.Reserva.count(),
    models.Cliente.count(),
    models.Habitacion.count(),
    models.Pago.count(),
  ]);

  // Reservas por estado
  const reservasPorEstado = await models.Reserva.findAll({
    attributes: ['estado', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total']],
    group: ['estado']
  });

  // Ingresos totales (pagos completados)
  const ingresosTotales = await models.Pago.sum('monto', {
    where: { estado: 'aprobado' }
  });

  return { 
    totalHoteles, 
    totalReservas, 
    totalClientes, 
    totalHabitaciones, 
    totalPagos,
    ingresosTotales: ingresosTotales || 0,
    reservasPorEstado
  };
}

// =============================================
// OCUPACIÓN POR FECHAS
// =============================================
async function getOcupacion({ fecha_inicio, fecha_fin, hotel_id = null }) {
  const whereReserva = {
    estado: { [Op.in]: ['confirmada', 'check_in', 'check_out'] },
    fecha_entrada: { [Op.lte]: fecha_fin },
    fecha_salida: { [Op.gte]: fecha_inicio }
  };

  if (hotel_id) {
    whereReserva.hotel_id = hotel_id;
  }

  const reservas = await models.Reserva.findAll({
    where: whereReserva,
    include: [
      { model: models.Cliente, as: 'cliente', attributes: ['nombres', 'apellidos'] },
      { model: models.Hotel, as: 'hotel', attributes: ['nombre'] }
    ]
  });

  const totalHabitaciones = await models.Habitacion.count({ where: hotel_id ? { hotel_id } : {} });
  const habitacionesOcupadas = reservas.length;

  return {
    periodo: { fecha_inicio, fecha_fin },
    hotel_id: hotel_id || 'todos',
    habitaciones_totales: totalHabitaciones,
    habitaciones_ocupadas: habitacionesOcupadas,
    porcentaje_ocupacion: totalHabitaciones > 0 ? ((habitacionesOcupadas / totalHabitaciones) * 100).toFixed(2) : 0,
    reservas: reservas
  };
}

// =============================================
// INGRESOS POR PERÍODO
// =============================================
async function getIngresos({ fecha_inicio, fecha_fin, hotel_id = null }) {
  const wherePago = {
    estado: 'aprobado',
    fecha_pago: { [Op.between]: [fecha_inicio, fecha_fin] }
  };

  const whereReserva = {};
  if (hotel_id) {
    whereReserva.hotel_id = hotel_id;
  }

  const pagos = await models.Pago.findAll({
    where: wherePago,
    include: [
      { 
        model: models.Reserva, 
        as: 'reserva',
        where: whereReserva,
        include: [
          { model: models.Hotel, as: 'hotel', attributes: ['nombre'] }
        ]
      }
    ]
  });

  const totalIngresos = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
  const ingresosPorHotel = {};

  pagos.forEach(pago => {
    const hotelNombre = pago.reserva?.hotel?.nombre || 'Sin hotel';
    if (!ingresosPorHotel[hotelNombre]) {
      ingresosPorHotel[hotelNombre] = 0;
    }
    ingresosPorHotel[hotelNombre] += parseFloat(pago.monto);
  });

  return {
    periodo: { fecha_inicio, fecha_fin },
    total_ingresos: totalIngresos,
    ingresos_por_hotel: ingresosPorHotel,
    pagos: pagos
  };
}

// =============================================
// RESERVAS POR ESTADO
// =============================================
async function getReservasPorEstado(hotel_id = null) {
  const where = {};
  if (hotel_id) {
    where.hotel_id = hotel_id;
  }

  const reservasPorEstado = await models.Reserva.findAll({
    where,
    attributes: ['estado', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total']],
    group: ['estado']
  });

  const totalReservas = reservasPorEstado.reduce((sum, item) => sum + parseInt(item.dataValues.total), 0);

  return {
    total_reservas: totalReservas,
    por_estado: reservasPorEstado,
    filtro_hotel: hotel_id || 'todos'
  };
}

// =============================================
// HOTELES MÁS RESERVADOS
// =============================================
async function getHotelesTop(limit = 10) {
  const hotelesTop = await models.Hotel.findAll({
    attributes: [
      'id', 'nombre', 'ciudad',
      [models.sequelize.fn('COUNT', models.sequelize.col('reservas.id')), 'total_reservas']
    ],
    include: [
      {
        model: models.Reserva,
        as: 'reservas',
        attributes: [],
        where: { estado: { [Op.notIn]: ['cancelada', 'no_show'] } }
      }
    ],
    group: ['hoteles.id'],
    order: [[models.sequelize.literal('total_reservas'), 'DESC']],
    limit: parseInt(limit)
  });

  return hotelesTop;
}

// =============================================
// SERVICIOS MÁS CONTRATADOS
// =============================================
async function getServiciosTop(limit = 10) {
  const serviciosTop = await models.Servicio.findAll({
    attributes: [
      'id', 'nombre', 'precio',
      [models.sequelize.fn('COUNT', models.sequelize.col('reserva_servicios.id')), 'total_contrataciones']
    ],
    include: [
      {
        model: models.ReservaServicio,
        as: 'reserva_servicios',
        attributes: []
      }
    ],
    group: ['servicios.id'],
    order: [[models.sequelize.literal('total_contrataciones'), 'DESC']],
    limit: parseInt(limit)
  });

  return serviciosTop;
}

// =============================================
// CLIENTES FRECUENTES
// =============================================
async function getClientesFrecuentes(limit = 10) {
  const clientesTop = await models.Cliente.findAll({
    attributes: [
      'id', 'nombres', 'apellidos', 'email',
      [models.sequelize.fn('COUNT', models.sequelize.col('reservas.id')), 'total_reservas'],
      [models.sequelize.fn('SUM', models.sequelize.col('reservas.precio_total')), 'total_gastado']
    ],
    include: [
      {
        model: models.Reserva,
        as: 'reservas',
        attributes: [],
        where: { estado: { [Op.in]: ['confirmada', 'check_out'] } }
      }
    ],
    group: ['clientes.id'],
    order: [[models.sequelize.literal('total_reservas'), 'DESC']],
    limit: parseInt(limit)
  });

  return clientesTop;
}

// =============================================
// CANCELACIONES POR PERÍODO
// =============================================
async function getCancelaciones({ fecha_inicio, fecha_fin, hotel_id = null }) {
  const where = {
    estado: 'cancelada',
    updated_at: { [Op.between]: [fecha_inicio, fecha_fin] }
  };

  if (hotel_id) {
    where.hotel_id = hotel_id;
  }

  const cancelaciones = await models.Reserva.findAll({
    where,
    include: [
      { model: models.Cliente, as: 'cliente', attributes: ['nombres', 'apellidos', 'email'] },
      { model: models.Hotel, as: 'hotel', attributes: ['nombre'] }
    ],
    order: [['updated_at', 'DESC']]
  });

  const totalCancelaciones = cancelaciones.length;
  const cancelacionesPorHotel = {};

  cancelaciones.forEach(reserva => {
    const hotelNombre = reserva.hotel?.nombre || 'Sin hotel';
    if (!cancelacionesPorHotel[hotelNombre]) {
      cancelacionesPorHotel[hotelNombre] = 0;
    }
    cancelacionesPorHotel[hotelNombre]++;
  });

  return {
    periodo: { fecha_inicio, fecha_fin },
    total_cancelaciones: totalCancelaciones,
    cancelaciones_por_hotel: cancelacionesPorHotel,
    cancelaciones: cancelaciones
  };
}

// =============================================
// EXPORTS
// =============================================
module.exports = { 
  getDashboard,
  getOcupacion,
  getIngresos,
  getReservasPorEstado,
  getHotelesTop,
  getServiciosTop,
  getClientesFrecuentes,
  getCancelaciones
};