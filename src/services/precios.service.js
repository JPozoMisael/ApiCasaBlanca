const { Op } = require('sequelize');
const { models } = require('../models');

/*
|--------------------------------------------------------------------------
| Determinar tipo de día
|--------------------------------------------------------------------------
*/
function obtenerTipoDia(fecha) {
  const dia = new Date(fecha).getDay();

  // 0 = Domingo
  // 6 = Sábado
  if (dia === 0 || dia === 6) {
    return 'fin_semana';
  }

  return 'entre_semana';
}

/*
|--------------------------------------------------------------------------
| Obtener temporada activa para una fecha
|--------------------------------------------------------------------------
*/
async function obtenerTemporada({ hotel_id, fecha }) {
  return models.Temporada.findOne({
    where: {
      hotel_id,
      estado: 'activo',
      fecha_inicio: {
        [Op.lte]: fecha,
      },
      fecha_fin: {
        [Op.gte]: fecha,
      },
    },
    order: [['fecha_inicio', 'DESC']],
  });
}

/*
|--------------------------------------------------------------------------
| Obtener precio por noche
|--------------------------------------------------------------------------
*/
async function obtenerPrecioNoche({
  hotel_id,
  tipo_habitacion_id,
  fecha,
}) {
  if (!hotel_id) {
    const err = new Error(
      'hotel_id es obligatorio'
    );
    err.statusCode = 400;
    throw err;
  }

  if (!tipo_habitacion_id) {
    const err = new Error(
      'tipo_habitacion_id es obligatorio'
    );
    err.statusCode = 400;
    throw err;
  }

  if (!fecha) {
    const err = new Error(
      'fecha es obligatoria'
    );
    err.statusCode = 400;
    throw err;
  }

  /*
  |--------------------------------------------------------------------------
  | Buscar temporada
  |--------------------------------------------------------------------------
  */

  const temporada =
    await obtenerTemporada({
      hotel_id,
      fecha,
    });

  if (!temporada) {
    const err = new Error(
      'No existe una temporada activa para la fecha indicada'
    );
    err.statusCode = 404;
    throw err;
  }

  /*
  |--------------------------------------------------------------------------
  | Determinar tipo de día
  |--------------------------------------------------------------------------
  */

  const tipoDia =
    obtenerTipoDia(fecha);

  /*
  |--------------------------------------------------------------------------
  | Buscar tarifa
  |--------------------------------------------------------------------------
  */

  const tarifa =
    await models.TarifaHabitacion.findOne({
      where: {
        hotel_id,
        tipo_habitacion_id,
        temporada_id: temporada.id,
        tipo_dia: tipoDia,
        estado: 'activo',
      },
    });

  if (!tarifa) {
    const err = new Error(
      `No existe tarifa configurada para:
      hotel=${hotel_id},
      tipo_habitacion=${tipo_habitacion_id},
      temporada=${temporada.nombre},
      tipo_dia=${tipoDia}`
    );

    err.statusCode = 404;

    throw err;
  }

  return Number(tarifa.precio);
}

module.exports = {
  obtenerPrecioNoche,
  obtenerTemporada,
  obtenerTipoDia,
};