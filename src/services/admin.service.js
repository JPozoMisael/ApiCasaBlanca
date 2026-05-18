const { models } = require('../models');


// =========================================
// DASHBOARD
// =========================================

async function dashboard() {

  const [
    totalReservas,
    totalClientes,
    totalHabitaciones,
    ingresosTotales,
  ] = await Promise.all([

    models.Reserva.count(),

    models.Cliente.count(),

    models.Habitacion.count(),

    models.Pago.sum('monto'),
  ]);


  return {
    totalReservas,
    totalClientes,
    totalHabitaciones,
    ingresosTotales: Number(
      ingresosTotales || 0
    ),
  };
}


// =========================================
// LISTAR USUARIOS
// =========================================

async function listarUsuarios() {

  return models.User.findAll({

    order: [['id', 'DESC']],

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


  // ===============================
  // VALIDACIONES
  // ===============================

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


  // ===============================
  // NORMALIZAR EMAIL
  // ===============================

  const emailNorm = String(email)
    .trim()
    .toLowerCase();


  // ===============================
  // VALIDAR ROLES
  // ===============================

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


  // ===============================
  // VALIDAR EMAIL DUPLICADO
  // ===============================

  const existe = await models.User.findOne({
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


  // ===============================
  // CREAR USUARIO
  // ===============================

  const usuario = await models.User.create({

    hotel_id: hotel_id || null,

    nombre,

    apellido,

    email: emailNorm,

    password,

    rol: rol || 'cliente',

    estado: 'activo',
  });


  return usuario;
}


// =========================================
// CAMBIAR ROL
// =========================================

async function cambiarRol(id, rol) {

  const user = await models.User.findByPk(id);


  if (!user) {
    return null;
  }


  const rolesValidos = [
    'super_admin',
    'admin',
    'recepcion',
    'cliente',
  ];


  if (!rolesValidos.includes(rol)) {

    const err = new Error(
      'Rol inválido'
    );

    err.statusCode = 400;

    throw err;
  }


  await user.update({ rol });


  return user;
}


module.exports = {
  dashboard,
  listarUsuarios,
  crearUsuario,
  cambiarRol,
};