const adminService =
  require('../services/admin.service');


// =========================================
// DASHBOARD
// GET /api/v1/admin/dashboard
// =========================================

async function dashboard(
  req,
  res,
  next
) {

  try {

    const data =
      await adminService.dashboard();

    return res.status(200).json({

      ok: true,

      data,
    });

  } catch (error) {

    console.error(

      'Error dashboard:',

      error.message
    );

    next(error);
  }
}


// =========================================
// DASHBOARD STATS
// GET /api/v1/admin/dashboard/stats
// =========================================

async function dashboardStats(
  req,
  res,
  next
) {

  try {

    const stats =
      await adminService.dashboardStats();

    return res.status(200).json({

      ok: true,

      data: stats,
    });

  } catch (error) {

    console.error(

      'Error dashboard stats:',

      error.message
    );

    next(error);
  }
}


// =========================================
// RESERVAS DEL DÍA
// GET /api/v1/admin/dashboard/today-bookings
// =========================================

async function todayBookings(
  req,
  res,
  next
) {

  try {

    const reservas =
      await adminService.todayBookings();

    return res.status(200).json({

      ok: true,

      data: reservas,
    });

  } catch (error) {

    console.error(

      'Error today bookings:',

      error.message
    );

    next(error);
  }
}


// =========================================
// LISTAR USUARIOS
// GET /api/v1/admin/usuarios
// =========================================

async function listarUsuarios(
  req,
  res,
  next
) {

  try {

    const usuarios =
      await adminService.listarUsuarios();

    return res.status(200).json({

      ok: true,

      data: usuarios,

      meta: {
        total: usuarios.length,
      },
    });

  } catch (error) {

    console.error(

      'Error listar usuarios:',

      error.message
    );

    next(error);
  }
}


// =========================================
// CREAR USUARIO
// POST /api/v1/admin/usuarios
// =========================================

async function crearUsuario(
  req,
  res,
  next
) {

  try {

    const usuario =
      await adminService.crearUsuario(
        req.body
      );

    return res.status(201).json({

      ok: true,

      message:
        'Usuario creado correctamente',

      data: usuario,
    });

  } catch (error) {

    console.error(

      'Error crear usuario:',

      error.message
    );

    next(error);
  }
}


// =========================================
// CAMBIAR ROL
// PATCH /api/v1/admin/usuarios/:id/rol
// =========================================

async function cambiarRol(
  req,
  res,
  next
) {

  try {

    const id =
      Number(req.params.id);

    const { rol } =
      req.body;


    // =====================================
    // VALIDAR ID
    // =====================================

    if (isNaN(id)) {

      return res.status(400).json({

        ok: false,

        message: 'ID inválido',
      });
    }


    // =====================================
    // ROLES VÁLIDOS
    // =====================================

    const rolesValidos = [

      'super_admin',

      'admin',

      'recepcion',

      'cliente',
    ];


    if (
      !rol ||
      !rolesValidos.includes(rol)
    ) {

      return res.status(400).json({

        ok: false,

        message: 'Rol inválido',
      });
    }


    // =====================================
    // ACTUALIZAR ROL
    // =====================================

    const usuario =
      await adminService.cambiarRol(
        id,
        rol
      );


    // =====================================
    // NO ENCONTRADO
    // =====================================

    if (!usuario) {

      return res.status(404).json({

        ok: false,

        message:
          'Usuario no encontrado',
      });
    }


    return res.status(200).json({

      ok: true,

      message:
        'Rol actualizado correctamente',

      data: usuario,
    });

  } catch (error) {

    console.error(

      'Error cambiar rol:',

      error.message
    );

    next(error);
  }
}


module.exports = {
  dashboard,
  dashboardStats,
  todayBookings,
  listarUsuarios,
  crearUsuario,
  cambiarRol,
};