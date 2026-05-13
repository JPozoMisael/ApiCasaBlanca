const { models } = require('../models');

// ======================================================
// LISTAR
// ======================================================
const listar = (
  filtros = {}
) => {

  const where = {};

  // ================= FILTROS =================
  if (filtros.hotel_id) {

    where.hotel_id =
      filtros.hotel_id;
  }

  if (
    filtros.tipo_habitacion_id
  ) {

    where.tipo_habitacion_id =
      filtros.tipo_habitacion_id;
  }

  if (filtros.estado) {

    where.estado =
      filtros.estado;
  }

  return models.Habitacion.findAll({

    where,

    include: [
      {
        model:
          models.TipoHabitacion,

        as: 'tipoHabitacion',

        attributes: [
          'id',
          'nombre',
          'descripcion',
          'capacidad_maxima',
          'camas_sencillas',
          'camas_dobles',
          'tiene_vista',
          'tiene_balcon'
        ]
      }
    ],

    order: [
      ['id', 'DESC']
    ],
  });
};

// ======================================================
// OBTENER POR ID
// ======================================================
const obtenerPorId = (
  id
) => {

  return models.Habitacion.findByPk(id, {

    include: [
      {
        model:
          models.TipoHabitacion,

        as: 'tipoHabitacion',
        attributes: [
          'id',
          'nombre',
          'descripcion',
          'capacidad_maxima',
          'camas_sencillas',
          'camas_dobles',
          'tiene_vista',
          'tiene_balcon'
        ]
      }
    ]
  });
};

// ======================================================
// CREAR
// ======================================================
const crear = (
  data
) => {

  return models.Habitacion.create(
    data
  );
};

// ======================================================
// ACTUALIZAR
// ======================================================
const actualizar = async (
  id,
  data
) => {

  const hab =
    await models.Habitacion.findByPk(id);

  if (!hab) {

    return null;
  }

  return hab.update(data);
};

// ======================================================
// ELIMINAR
// ======================================================
const eliminar = async (
  id
) => {

  const hab =
    await models.Habitacion.findByPk(id);

  if (!hab) {

    return false;
  }

  await hab.destroy();

  return true;
};

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};