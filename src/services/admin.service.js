const { models } =
  require('../models');

const { Op } =
  require('sequelize');


// =========================================
// DASHBOARD GENERAL
// =========================================

async function dashboard() {

  const [
    totalReservas,
    totalClientes,
    totalHabitaciones,
    ingresosTotales,
    totalUsuarios

  ] = await Promise.all([

    models.Reserva.count(),

    models.Cliente.count(),

    models.Habitacion.count(),

    models.Pago.sum('monto'),

    models.User.count(),
  ]);


  return {
    totalReservas,
    totalClientes,
    totalHabitaciones,
    totalUsuarios,
    ingresosTotales:
      Number(
        ingresosTotales || 0
      ),
  };
}


// =========================================
// DASHBOARD STATS
// =========================================

async function dashboardStats() {

  const [
    totalReservas,
    reservasActivas,
    reservasCanceladas,
    totalHabitaciones,
    habitacionesDisponibles,
    totalClientes,
    ingresosTotales

  ] = await Promise.all([

    // =====================================
    // RESERVAS
    // =====================================

    models.Reserva.count(),

    models.Reserva.count({
      where: {
        estado: {
          [Op.notIn]: [
            'cancelada',
            'no_show'
          ]
        }
      }
    }),

    models.Reserva.count({
      where: {
        estado: 'cancelada'
      }
    }),


    // =====================================
    // HABITACIONES
    // =====================================

    models.Habitacion.count(),

    models.Habitacion.count({
      where: {
        estado: 'disponible'
      }
    }),


    // =====================================
    // CLIENTES
    // =====================================

    models.Cliente.count(),


    // =====================================
    // INGRESOS
    // =====================================

    models.Pago.sum('monto'),
  ]);


  return {

    reservas: {

      total:
        totalReservas,

      activas:
        reservasActivas,

      canceladas:
        reservasCanceladas,
    },


    habitaciones: {

      total:
        totalHabitaciones,

      disponibles:
        habitacionesDisponibles,
    },


    clientes:
      totalClientes,


    ingresosTotales:
      Number(
        ingresosTotales || 0
      ),
  };
}


// =========================================
// RESERVAS DEL DÍA
// =========================================

async function todayBookings() {

  const hoy =
    new Date();

  hoy.setHours(
    0,
    0,
    0,
    0
  );


  const manana =
    new Date(hoy);

  manana.setDate(
    manana.getDate() + 1
  );


  const reservas =
    await models.Reserva.findAll({

      where: {

        createdAt: {

          [Op.gte]: hoy,

          [Op.lt]: manana,
        },
      },

      order: [
        ['createdAt', 'DESC']
      ],

      limit: 20,
    });


  return reservas;
}


// =========================================
// LISTAR USUARIOS
// =========================================

async function listarUsuarios() {

  return models.User.findAll({

    order: [
      ['id', 'DESC']
    ],

    attributes: {
      exclude: ['password'],
    },
  });
}


// =========================================
// CREAR USUARIO
// =========================================

async function crearUsuario(data) {

  const {
    hotel_id,
    nombre,
    apellido,
    email,
    password,
    rol,

  } = data;


  // =====================================
  // VALIDAR DATOS
  // =====================================

  if (

    !nombre ||
    !apellido ||
    !email ||
    !password

  ) {

    const err = new Error(
      'Datos incompletos'
    );

    err.statusCode = 400;

    throw err;
  }


  // =====================================
  // NORMALIZAR EMAIL
  // =====================================

  const emailNorm =
    String(email)
      .trim()
      .toLowerCase();


  // =====================================
  // VALIDAR ROLES
  // =====================================

  const rolesValidos = [
    'super_admin',
    'admin',
    'recepcion',
    'cliente',
  ];


  if (

    rol &&

    !rolesValidos.includes(rol)

  ) {

    const err = new Error(
      'Rol inválido'
    );

    err.statusCode = 400;

    throw err;
  }


  // =====================================
  // VALIDAR EMAIL DUPLICADO
  // =====================================

  const existe =
    await models.User.findOne({

      where: {
        email: emailNorm,
      },
    });


  if (existe) {

    const err = new Error(
      'El email ya está registrado'
    );

    err.statusCode = 409;

    throw err;
  }


  // =====================================
  // CREAR USUARIO
  // =====================================

  const usuario =
    await models.User.create({

      hotel_id:
        hotel_id || null,
      nombre,
      apellido,
      email: emailNorm,
      password,
      rol:
        rol || 'cliente',

      estado: 'activo',
    });


  return usuario;
}


// =========================================
// CAMBIAR ROL
// =========================================

async function cambiarRol(
  id,
  rol
) {

  const user =
    await models.User.findByPk(id);


  // =====================================
  // VALIDAR USUARIO
  // =====================================

  if (!user) {
    return null;
  }


  // =====================================
  // VALIDAR ROLES
  // =====================================

  const rolesValidos = [
    'super_admin',
    'admin',
    'recepcion',
    'cliente',
  ];


  if (
    !rolesValidos.includes(rol)
  ) {

    const err = new Error(
      'Rol inválido'
    );

    err.statusCode = 400;

    throw err;
  }


  // =====================================
  // ACTUALIZAR
  // =====================================

  await user.update({
    rol
  });


  return user;
}


module.exports = {
  dashboard,
  dashboardStats,
  todayBookings,
  listarUsuarios,
  crearUsuario,
  cambiarRol,
};