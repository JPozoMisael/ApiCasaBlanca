const habitacionesService = require('../services/habitacion.service');
const { Hotel, models } = require('../models');
const { Op } = require('sequelize');

// ================= LISTAR =================
async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id ? Number(req.query.hotel_id) : undefined,
      tipo_habitacion_id: req.query.tipo_habitacion_id ? Number(req.query.tipo_habitacion_id) : undefined,
      estado: req.query.estado,
    };

    const habitaciones = await habitacionesService.listarHabitaciones(filtros);

    res.status(200).json({
      ok: true,
      data: habitaciones,
      meta: { total: habitaciones.length },
    });

  } catch (error) {
    console.error('Error listar habitaciones:', error.message);
    next(error);
  }
}

// ================= DISPONIBLES (🔥 PRO) =================
async function obtenerDisponibles(req, res, next) {
  try {

    const {
      hotel: slug,
      checkIn,
      checkOut,
      adults
    } = req.query;

    if (!slug || !checkIn || !checkOut) {
      return res.status(400).json({
        ok: false,
        message: 'Parámetros incompletos'
      });
    }

    // 🔍 Buscar hotel
    const hotel = await Hotel.findOne({
      where: { slug }
    });

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado'
      });
    }

    // 🏨 Traer habitaciones con tipo
    let habitaciones = await habitacionesService.listarHabitaciones({
      hotel_id: hotel.id
    });

    // 👥 FILTRO POR CAPACIDAD
    if (adults) {
      habitaciones = habitaciones.filter(h =>
        (h.tipoHabitacion?.capacidad_maxima || 1) >= Number(adults)
      );
    }

    // 🔴 BLOQUEO POR RESERVAS (CLAVE)
    const reservas = await models.Reserva.findAll({
      where: {
        [Op.and]: [
          { fecha_entrada: { [Op.lt]: checkOut } },
          { fecha_salida: { [Op.gt]: checkIn } }
        ]
      },
      attributes: ['habitacion_id']
    });

    const ocupadas = reservas.map(r => r.habitacion_id);

    // ❌ excluir ocupadas
    habitaciones = habitaciones.filter(h => !ocupadas.includes(h.id));

    // 🧪 DEBUG (puedes quitar luego)
    console.log('DISPONIBLES:', habitaciones.length);

    res.status(200).json({
      ok: true,
      data: habitaciones,
      meta: {
        hotel: hotel.nombre,
        total: habitaciones.length
      }
    });

  } catch (error) {
    console.error('Error obtener disponibles:', error.message);
    next(error);
  }
}

// ================= POR HOTEL =================
async function obtenerPorHotel(req, res, next) {
  try {
    const { slug } = req.params;

    const hotel = await Hotel.findOne({
      where: { slug }
    });

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado'
      });
    }

    const habitaciones = await habitacionesService.listarHabitaciones({
      hotel_id: hotel.id
    });

    res.status(200).json({
      ok: true,
      data: habitaciones,
      meta: {
        hotel: hotel.nombre,
        total: habitaciones.length
      }
    });

  } catch (error) {
    console.error('Error obtener habitaciones por hotel:', error.message);
    next(error);
  }
}

// ================= POR ID =================
async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

    const habitacion = await habitacionesService.obtenerHabitacionPorId(id);

    if (!habitacion) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      data: habitacion,
    });

  } catch (error) {
    console.error('Error obtener habitación:', error.message);
    next(error);
  }
}

// ================= CREAR =================
async function crear(req, res, next) {
  try {
    const habitacion = await habitacionesService.crearHabitacion(req.body);

    res.status(201).json({
      ok: true,
      message: 'Habitación creada correctamente',
      data: habitacion,
    });

  } catch (error) {
    console.error('Error crear habitación:', error.message);
    next(error);
  }
}

// ================= ACTUALIZAR =================
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

    const habitacion = await habitacionesService.actualizarHabitacion(id, req.body);

    if (!habitacion) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Habitación actualizada correctamente',
      data: habitacion,
    });

  } catch (error) {
    console.error('Error actualizar habitación:', error.message);
    next(error);
  }
}

// ================= ELIMINAR =================
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

    const okDelete = await habitacionesService.eliminarHabitacion(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Habitación no encontrada',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Habitación eliminada correctamente',
    });

  } catch (error) {
    console.error('Error eliminar habitación:', error.message);
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerPorHotel,
  obtenerDisponibles 
};