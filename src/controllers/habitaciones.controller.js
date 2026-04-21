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

// ================= DISPONIBLES =================
async function obtenerDisponibles(req, res, next) {
  try {

    const {
      hotel: slug,
      checkIn,
      checkOut,
      adults,

      precioMin,
      precioMax,
      capacidad,
      sort,

      page = 1,
      limit = 10

    } = req.query;

    if (!slug || !checkIn || !checkOut) {
      return res.status(400).json({
        ok: false,
        message: 'Parámetros incompletos'
      });
    }

    const fechaEntrada = new Date(checkIn);
    const fechaSalida = new Date(checkOut);

    const hotel = await Hotel.findOne({ where: { slug } });

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado'
      });
    }

    let habitaciones = await habitacionesService.listarHabitaciones({
      hotel_id: hotel.id
    });

    // ===== DISPONIBILIDAD =====
    const detallesOcupados = await models.DetalleReserva.findAll({
      attributes: ['habitacion_id'],
      include: [{
        model: models.Reserva,
        as: 'reserva',
        attributes: [],
        where: {
          estado: { [Op.notIn]: ['cancelada', 'no_show'] },
          [Op.and]: [
            { fecha_entrada: { [Op.lt]: fechaSalida } },
            { fecha_salida: { [Op.gt]: fechaEntrada } }
          ]
        }
      }]
    });

    const ocupadas = detallesOcupados.map(d => d.habitacion_id);

    habitaciones = habitaciones.filter(h => !ocupadas.includes(h.id));

    // ===== FILTROS =====
    if (precioMin) {
      habitaciones = habitaciones.filter(h =>
        (h.precio_noche ?? 0) >= Number(precioMin)
      );
    }

    if (precioMax) {
      habitaciones = habitaciones.filter(h =>
        (h.precio_noche ?? 0) <= Number(precioMax)
      );
    }

    if (capacidad) {
      habitaciones = habitaciones.filter(h =>
        (h.tipoHabitacion?.capacidad_maxima || 1) >= Number(capacidad)
      );
    }

    // ===== RANKING INTELIGENTE =====
    habitaciones = habitaciones.map(h => {

      let score = 0;

      const precio = Number(h.precio_noche ?? 0);
      score += (1000 - precio);

      if (adults) {
        const diff = Math.abs((h.tipoHabitacion?.capacidad_maxima || 1) - Number(adults));
        score += (100 - diff * 10);
      }

      if (h.tipoHabitacion?.nombre?.toLowerCase().includes('suite')) {
        score += 50;
      }

      score += Math.random() * 20;

      return {
        ...h,
        score
      };
    });

    // ===== ORDEN =====
    if (sort === 'precio_asc') {
      habitaciones.sort((a, b) =>
        (a.precio_noche ?? 0) - (b.precio_noche ?? 0)
      );
    } else if (sort === 'precio_desc') {
      habitaciones.sort((a, b) =>
        (b.precio_noche ?? 0) - (a.precio_noche ?? 0)
      );
    } else {
      habitaciones.sort((a, b) => b.score - a.score);
    }

    // ===== PAGINACIÓN =====
    const total = habitaciones.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;

    const data = habitaciones.slice(start, end);

    res.json({
      ok: true,
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    next(err);
  }
}

// ================= POR HOTEL =================
async function obtenerPorHotel(req, res, next) {
  try {
    const { slug } = req.params;

    const hotel = await Hotel.findOne({ where: { slug } });

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
  obtenerDisponibles,
};