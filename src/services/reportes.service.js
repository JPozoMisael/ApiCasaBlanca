const { Op } = require('sequelize');
const { models } = require('../models');
const { ESTADOS_RESERVA_ACTIVOS } = require('../config/constants');
const { hoyISO, sumarDias, nochesDelRango, diasEntre } = require('../utils/dates');
const { redondear } = require('../utils/money');
const { FUERA_DE_INVENTARIO } = require('./disponibilidad.service');

const { AppError } = require('../utils/errors');

function validarLargoRango(desde, hasta) {
  if (diasEntre(desde, hasta) > 366) throw new AppError('El rango máximo es de 366 días', 400, 'RANGO_MUY_LARGO');
}

// hotelId = null → toda la plataforma (solo super_admin).
const porHotel = (hotelId) => (hotelId ? { hotel_id: hotelId } : {});

async function totalHabitacionesVendibles(hotelId) {
  return models.Habitacion.count({
    where: { ...porHotel(hotelId), estado: { [Op.notIn]: FUERA_DE_INVENTARIO } },
  });
}

// Noches-habitación ocupadas por día en [desde, hasta] (ambos incluidos).
async function ocupacionPorDia(hotelId, desde, hasta) {
  const [total, reservas] = await Promise.all([
    totalHabitacionesVendibles(hotelId),
    models.Reserva.findAll({
      where: {
        ...porHotel(hotelId),
        estado: { [Op.in]: [...ESTADOS_RESERVA_ACTIVOS, 'check_out'] },
        fecha_entrada: { [Op.lte]: hasta },
        fecha_salida: { [Op.gt]: desde },
      },
      attributes: ['id', 'fecha_entrada', 'fecha_salida'],
      include: [{ model: models.DetalleReserva, as: 'detalles', attributes: ['id'] }],
    }),
  ]);

  const dias = nochesDelRango(desde, sumarDias(hasta, 1));
  const ocupadas = new Map(dias.map((d) => [d, 0]));
  for (const r of reservas) {
    const habitaciones = r.detalles.length;
    for (const d of nochesDelRango(r.fecha_entrada, r.fecha_salida)) {
      if (ocupadas.has(d)) ocupadas.set(d, ocupadas.get(d) + habitaciones);
    }
  }

  return {
    total_habitaciones: total,
    dias: dias.map((fecha) => ({
      fecha,
      ocupadas: ocupadas.get(fecha),
      porcentaje: total ? redondear((ocupadas.get(fecha) / total) * 100, 1) : 0,
    })),
  };
}

async function dashboard(hotelId) {
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const w = porHotel(hotelId);

  const [llegadasHoy, salidasHoy, enCasa, pendientes, pagosMes, reservasMes, ocup] = await Promise.all([
    models.Reserva.count({ where: { ...w, fecha_entrada: hoy, estado: 'confirmada' } }),
    models.Reserva.count({ where: { ...w, fecha_salida: hoy, estado: 'check_in' } }),
    models.Reserva.count({ where: { ...w, estado: 'check_in' } }),
    models.Reserva.count({ where: { ...w, estado: 'pendiente' } }),
    models.Pago.findAll({
      where: { estado: 'aprobado', fecha_pago: { [Op.gte]: inicioMes } },
      include: [{ model: models.Reserva, as: 'reserva', attributes: [], where: w, required: true }],
      attributes: ['monto'],
      raw: true,
    }),
    models.Reserva.findAll({
      where: { ...w, created_at: { [Op.gte]: inicioMes }, estado: { [Op.ne]: 'cancelada' } },
      attributes: ['precio_total', 'comision'],
      raw: true,
    }),
    ocupacionPorDia(hotelId, hoy, hoy),
  ]);

  return {
    fecha: hoy,
    llegadas_hoy: llegadasHoy,
    salidas_hoy: salidasHoy,
    huespedes_en_casa: enCasa,
    reservas_pendientes: pendientes,
    ocupacion_hoy: ocup.dias[0],
    total_habitaciones: ocup.total_habitaciones,
    ingresos_mes: redondear(pagosMes.reduce((s, p) => s + Number(p.monto), 0)),
    reservas_mes: reservasMes.length,
    ventas_mes: redondear(reservasMes.reduce((s, r) => s + Number(r.precio_total), 0)),
    comision_mes: redondear(reservasMes.reduce((s, r) => s + Number(r.comision), 0)),
  };
}

async function ocupacion(hotelId, desde, hasta) {
  validarLargoRango(desde, hasta);
  const r = await ocupacionPorDia(hotelId, desde, hasta);
  const totalNoches = r.dias.reduce((s, d) => s + d.ocupadas, 0);
  const disponibles = r.total_habitaciones * r.dias.length;
  return {
    desde,
    hasta,
    ...r,
    ocupacion_promedio: disponibles ? redondear((totalNoches / disponibles) * 100, 1) : 0,
  };
}

async function ingresos(hotelId, desde, hasta) {
  validarLargoRango(desde, hasta);
  const pagos = await models.Pago.findAll({
    where: { estado: 'aprobado', fecha_pago: { [Op.gte]: desde, [Op.lt]: sumarDias(hasta, 1) } },
    include: [{ model: models.Reserva, as: 'reserva', attributes: ['hotel_id'], where: porHotel(hotelId), required: true }],
    raw: true,
    nest: true,
  });

  const porMetodo = {};
  const porDia = {};
  for (const p of pagos) {
    porMetodo[p.metodo] = redondear((porMetodo[p.metodo] || 0) + Number(p.monto));
    const dia = String(p.fecha_pago).slice(0, 10);
    porDia[dia] = redondear((porDia[dia] || 0) + Number(p.monto));
  }

  return {
    desde,
    hasta,
    total: redondear(pagos.reduce((s, p) => s + Number(p.monto), 0)),
    por_metodo: porMetodo,
    por_dia: Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, monto]) => ({ fecha, monto })),
  };
}

// Panorama de la plataforma (solo super_admin).
async function plataforma() {
  const [hoteles, hotelesActivos, pendientes, reservas, usuarios] = await Promise.all([
    models.Hotel.count(),
    models.Hotel.count({ where: { estado: 'activo' } }),
    models.Hotel.count({ where: { estado: 'pendiente' } }),
    models.Reserva.findAll({
      where: { estado: { [Op.ne]: 'cancelada' } },
      attributes: ['hotel_id', 'precio_total', 'comision'],
      raw: true,
    }),
    models.User.count({ where: { rol: 'cliente' } }),
  ]);

  const porHotelId = new Map();
  for (const r of reservas) {
    const acc = porHotelId.get(r.hotel_id) || { reservas: 0, ventas: 0 };
    acc.reservas += 1;
    acc.ventas += Number(r.precio_total);
    porHotelId.set(r.hotel_id, acc);
  }
  const nombres = new Map((await models.Hotel.findAll({ attributes: ['id', 'nombre'], raw: true })).map((h) => [h.id, h.nombre]));

  return {
    hoteles,
    hoteles_activos: hotelesActivos,
    hoteles_pendientes: pendientes,
    clientes_registrados: usuarios,
    reservas_totales: reservas.length,
    ventas_totales: redondear(reservas.reduce((s, r) => s + Number(r.precio_total), 0)),
    comisiones_totales: redondear(reservas.reduce((s, r) => s + Number(r.comision), 0)),
    top_hoteles: [...porHotelId.entries()]
      .map(([id, v]) => ({ hotel_id: id, nombre: nombres.get(id), reservas: v.reservas, ventas: redondear(v.ventas) }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10),
  };
}

module.exports = { dashboard, ocupacion, ingresos, plataforma };
