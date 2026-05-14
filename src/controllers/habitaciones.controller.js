const habitacionesService =
  require('../services/habitacion.service');

const { Hotel, models } =
  require('../models');

const { Op } =
  require('sequelize');

// ======================================================
// LISTAR
// ======================================================
async function listar(
  req,
  res,
  next
) {

  try {

    const filtros = {

      hotel_id:
        req.query.hotel_id
          ? Number(req.query.hotel_id)
          : undefined,

      tipo_habitacion_id:
        req.query.tipo_habitacion_id
          ? Number(req.query.tipo_habitacion_id)
          : undefined,

      estado:
        req.query.estado,
    };

    const habitaciones =
      await habitacionesService
        .listarHabitaciones(filtros);

    res.status(200).json({

      ok: true,

      data: habitaciones,

      meta: {
        total: habitaciones.length,
      },
    });

  } catch (error) {

    console.error(
      'Error listar habitaciones:',
      error
    );

    next(error);
  }
}

// ======================================================
// DISPONIBLES
// ======================================================
async function obtenerDisponibles(
  req,
  res,
  next
) {

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

    // ================= VALIDACION =================
    if (!slug) {

      return res.status(400).json({

        ok: false,

        message:
          'Hotel requerido'
      });
    }

    // ================= FECHAS =================
    let fechaEntrada = null;

    let fechaSalida = null;

    let usarDisponibilidad = false;

    if (checkIn && checkOut) {

      fechaEntrada =
        new Date(checkIn);

      fechaSalida =
        new Date(checkOut);

      const fechasValidas =
        !isNaN(fechaEntrada.getTime()) &&
        !isNaN(fechaSalida.getTime());

      if (fechasValidas) {

        if (fechaSalida <= fechaEntrada) {

          return res.status(400).json({

            ok: false,

            message:
              'checkOut debe ser mayor que checkIn'
          });
        }

        usarDisponibilidad = true;
      }
    }

    // ================= HOTEL =================
    const hotel =
      await Hotel.findOne({
        where: { slug }
      });

    if (!hotel) {

      return res.status(404).json({

        ok: false,

        message:
          'Hotel no encontrado'
      });
    }

    // ================= HABITACIONES =================
    let habitaciones =
      await habitacionesService
        .listarHabitaciones({

          hotel_id: hotel.id
        });

    console.log(
      'HABITACIONES ENCONTRADAS:',
      habitaciones.length
    );

    // ================= OCUPADAS =================
    if (usarDisponibilidad) {

      const detallesOcupados =
        await models.DetalleReserva.findAll({

          attributes: [
            'habitacion_id'
          ],

          include: [
            {
              model: models.Reserva,
              as: 'reserva',
              attributes: [],
              where: {
                estado: {
                  [Op.notIn]: [
                    'cancelada',
                    'no_show'
                  ]
                },

                [Op.and]: [

                  {
                    fecha_entrada: {
                      [Op.lt]: fechaSalida
                    }
                  },

                  {
                    fecha_salida: {
                      [Op.gt]: fechaEntrada
                    }
                  }
                ]
              }
            }
          ]
        });

      const ocupadas =
        detallesOcupados.map(
          d => d.habitacion_id
        );

      habitaciones =
        habitaciones.filter(
          h => !ocupadas.includes(h.id)
        );
    }

    // ================= FILTROS =================
    if (precioMin) {

      habitaciones =
        habitaciones.filter(
          h =>
            Number(
              h.precio_noche ??
              h.precio_base ??
              h.tipoHabitacion?.precio_base ??
              0
            ) >= Number(precioMin)
        );
    }

    if (precioMax) {

      habitaciones =
        habitaciones.filter(
          h =>
            Number(
              h.precio_noche ??
              h.precio_base ??
              h.tipoHabitacion?.precio_base ??
              0
            ) <= Number(precioMax)
        );
    }

    if (capacidad) {

      habitaciones =
        habitaciones.filter(
          h =>
            (
              h.tipoHabitacion
                ?.capacidad_maxima || 1
            ) >= Number(capacidad)
        );
    }

    // ================= REVIEWS =================
    let rating = 0;

    let totalReviews = 0;

    try {

      const reviews =
        await models.Valoracion.findAll({

          where: {
            hotel_id: hotel.id
          }
        });

      totalReviews =
        reviews.length;

      if (totalReviews > 0) {

        const sum =
          reviews.reduce(
            (acc, r) =>
              acc + Number(r.puntuacion),
            0
          );

        rating =
          +(
            sum /
            totalReviews
          ).toFixed(1);
      }

    } catch (err) {

      console.error(
        'ERROR REVIEWS:',
        err.message
      );
    }

    // ================= SCORE =================
    habitaciones =
      habitaciones.map(h => {

        let score = 0;

        const precio =
          Number(
            h.precio_noche ??
            h.precio_base ??
            h.tipoHabitacion?.precio_base ??
            0
          );

        score +=
          (1000 - precio);

        if (adults) {

          const diff =
            Math.abs(
              (
                h.tipoHabitacion
                  ?.capacidad_maxima || 1
              ) - Number(adults)
            );

          score +=
            (100 - diff * 10);
        }

        if (
          h.tipoHabitacion
            ?.nombre
            ?.toLowerCase()
            ?.includes('suite')
        ) {

          score += 50;
        }

        score += rating * 20;

        score += h.id % 10;

        return {

          ...(typeof h.toJSON === 'function'
            ? h.toJSON()
            : h),

          score,

          rating,

          totalReviews
        };
      });

    // ================= SORT =================
    if (sort === 'precio_asc') {

      habitaciones.sort(
        (a, b) =>
          Number(
            a.precio_noche ??
            a.precio_base ??
            a.tipoHabitacion?.precio_base ??
            0
          ) -
          Number(
            b.precio_noche ??
            b.precio_base ??
            b.tipoHabitacion?.precio_base ??
            0
          )
      );

    } else if (
      sort === 'precio_desc'
    ) {

      habitaciones.sort(
        (a, b) =>
          Number(
            b.precio_noche ??
            b.precio_base ??
            b.tipoHabitacion?.precio_base ??
            0
          ) -
          Number(
            a.precio_noche ??
            a.precio_base ??
            a.tipoHabitacion?.precio_base ??
            0
          )
      );

    } else {

      habitaciones.sort(
        (a, b) =>
          b.score - a.score
      );
    }

    // ================= PAGINACION =================
    const total =
      habitaciones.length;

    const pageNum =
      Math.max(
        1,
        Number(page) || 1
      );

    const limitNum =
      Math.min(
        50,
        Math.max(
          1,
          Number(limit) || 10
        )
      );

    const start =
      (pageNum - 1) * limitNum;

    const end =
      start + limitNum;

    const data =
      habitaciones.slice(start, end);

    res.status(200).json({

      ok: true,

      data,

      meta: {

        total,

        page: pageNum,

        limit: limitNum,

        pages:
          Math.ceil(
            total / limitNum
          )
      }
    });

  } catch (error) {

    console.error(
      'Error obtener disponibles:',
      error
    );

    res.status(500).json({

      ok: false,

      message:
        'Error interno del servidor'
    });
  }
}

// ======================================================
// POR HOTEL
// ======================================================
async function obtenerPorHotel(
  req,
  res,
  next
) {

  try {

    const { slug } =
      req.params;

    const hotel =
      await Hotel.findOne({
        where: { slug }
      });

    if (!hotel) {

      return res.status(404).json({

        ok: false,

        message:
          'Hotel no encontrado'
      });
    }

    const habitaciones =
      await habitacionesService
        .listarHabitaciones({

          hotel_id: hotel.id
        });

    res.status(200).json({

      ok: true,

      data: habitaciones,

      meta: {

        hotel:
          hotel.nombre,

        total:
          habitaciones.length
      }
    });

  } catch (error) {

    console.error(
      'Error obtener habitaciones por hotel:',
      error
    );

    next(error);
  }
}

// ======================================================
// POR ID
// ======================================================
async function obtenerPorId(
  req,
  res,
  next
) {

  try {

    const id =
      Number(req.params.id);

    if (isNaN(id)) {

      return res.status(400).json({

        ok: false,

        message:
          'ID inválido',
      });
    }

    const habitacion =
      await habitacionesService
        .obtenerHabitacionPorId(id);

    if (!habitacion) {

      return res.status(404).json({

        ok: false,

        message:
          'Habitación no encontrada',
      });
    }

    let rating = 0;

    let totalReviews = 0;

    try {

      const reviews =
        await models.Valoracion.findAll({

          where: {
            hotel_id:
              habitacion.hotel_id
          }
        });

      totalReviews =
        reviews.length;

      if (totalReviews > 0) {

        const sum =
          reviews.reduce(
            (acc, r) =>
              acc + Number(r.puntuacion),
            0
          );

        rating =
          +(
            sum /
            totalReviews
          ).toFixed(1);
      }

    } catch (err) {

      console.error(
        'ERROR REVIEWS:',
        err.message
      );
    }

    res.status(200).json({

      ok: true,

      data: {

        ...(typeof habitacion.toJSON === 'function'
          ? habitacion.toJSON()
          : habitacion),

        rating,

        totalReviews
      }
    });

  } catch (error) {

    console.error(
      'Error obtener habitación:',
      error
    );

    next(error);
  }
}

// ======================================================
// REVIEWS
// ======================================================
async function obtenerReviews(
  req,
  res,
  next
) {

  try {

    const hotelId =
      Number(req.params.hotelId);

    if (isNaN(hotelId)) {

      return res.status(400).json({

        ok: false,

        message:
          'hotelId inválido'
      });
    }

    const reviews =
      await models.Valoracion.findAll({

        where: {
          hotel_id: hotelId
        },

        order: [
          ['created_at', 'DESC']
        ]
      });

    res.status(200).json({

      ok: true,

      data: reviews
    });

  } catch (error) {

    console.error(
      'Error reviews:',
      error
    );

    next(error);
  }
}

// ======================================================
// CREAR REVIEW
// ======================================================
async function crearReview(
  req,
  res,
  next
) {

  try {

    const {
      hotel_id,
      puntuacion,
      comentario
    } = req.body;

    if (
      !hotel_id ||
      !puntuacion
    ) {

      return res.status(400).json({

        ok: false,

        message:
          'hotel_id y puntuacion son obligatorios'
      });
    }

    if (
      Number(puntuacion) < 1 ||
      Number(puntuacion) > 10
    ) {

      return res.status(400).json({

        ok: false,

        message:
          'puntuacion debe estar entre 1 y 10'
      });
    }

    const review =
      await models.Valoracion.create({

        hotel_id,

        puntuacion,

        comentario
      });

    res.status(201).json({

      ok: true,

      data: review
    });

  } catch (error) {

    console.error(
      'Error crear review:',
      error
    );

    next(error);
  }
}

// ======================================================
// CREAR
// ======================================================
async function crear(
  req,
  res,
 next
) {

  try {

    const habitacion =
      await habitacionesService
        .crearHabitacion(req.body);

    res.status(201).json({

      ok: true,

      data: habitacion
    });

  } catch (error) {

    console.error(
      'Error crear habitación:',
      error
    );

    next(error);
  }
}

// ======================================================
// ACTUALIZAR
// ======================================================
async function actualizar(
  req,
  res,
  next
) {

  try {

    const id =
      Number(req.params.id);

    if (isNaN(id)) {

      return res.status(400).json({

        ok: false,

        message:
          'ID inválido'
      });
    }

    const habitacion =
      await habitacionesService
        .actualizarHabitacion(
          id,
          req.body
        );

    if (!habitacion) {

      return res.status(404).json({

        ok: false,

        message:
          'Habitación no encontrada'
      });
    }

    res.status(200).json({

      ok: true,

      data: habitacion
    });

  } catch (error) {

    console.error(
      'Error actualizar habitación:',
      error
    );

    next(error);
  }
}

// ======================================================
// ELIMINAR
// ======================================================
async function eliminar(
  req,
  res,
  next
) {

  try {

    const id =
      Number(req.params.id);

    if (isNaN(id)) {

      return res.status(400).json({

        ok: false,

        message:
          'ID inválido'
      });
    }

    const okDelete =
      await habitacionesService
        .eliminarHabitacion(id);

    if (!okDelete) {

      return res.status(404).json({

        ok: false,

        message:
          'Habitación no encontrada'
      });
    }

    res.status(200).json({

      ok: true,

      message:
        'Habitación eliminada correctamente'
    });

  } catch (error) {

    console.error(
      'Error eliminar habitación:',
      error
    );

    next(error);
  }
}
/* ================= DESTACADO ================= */

async function destacado(req, res, next) {

  try {

    const hotel =
      await hotelesService
        .obtenerHotelDestacado();

    res.status(200).json({

      ok: true,

      data: hotel
    });

  } catch (error) {

    console.error(
      'Error hotel destacado:',
      error.message
    );

    next(error);
  }
}
/* ======================================================
   DESTACADAS
====================================================== */

async function destacadas(
  req,
  res,
  next
) {

  try {

    const data =
      await habitacionesService
        .obtenerHabitacionesDestacadas();

    res.status(200).json({

      ok: true,

      data

    });

  } catch (error) {

    console.error(
      'Error habitaciones destacadas:',
      error
    );

    next(error);
  }
}
module.exports = {
  listar,
  obtenerDisponibles,
  obtenerPorHotel,
  obtenerPorId,
  obtenerReviews,
  crearReview,
  crear,
  actualizar,
  eliminar,
  destacado,
  destacadas
};