const adminService = require('../services/admin.service');


// =========================================
// DASHBOARD
// GET /api/v1/admin/dashboard
// =========================================

async function dashboard(req, res, next) {

  try {

    const data = await adminService.dashboard();

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
// LISTAR USUARIOS
// GET /api/v1/admin/usuarios
// =========================================

async function listarUsuarios(req, res, next) {

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

async function crearUsuario(req, res, next) {

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

async function cambiarRol(req, res, next) {

  try {

    const id = Number(req.params.id);

    const { rol } = req.body;


    // ===============================
    // VALIDAR ID
    // ===============================

    if (isNaN(id)) {

      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }


    // ===============================
    // ROLES VÁLIDOS
    // ===============================

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


    // ===============================
    // ACTUALIZAR
    // ===============================

    const usuario =
      await adminService.cambiarRol(
        id,
        rol
      );


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
  listarUsuarios,
  crearUsuario,
  cambiarRol,
};