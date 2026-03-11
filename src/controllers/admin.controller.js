const adminService = require('../services/admin.service');

/**
 * GET /api/v1/admin/dashboard
 */
async function dashboard(req, res, next) {
  try {
    const data = await adminService.dashboard();

    res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/usuarios
 */
async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await adminService.listarUsuarios();

    res.status(200).json({
      ok: true,
      data: usuarios,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/admin/usuarios
 */
async function crearUsuario(req, res, next) {
  try {
    const usuario = await adminService.crearUsuario(req.body);

    res.status(201).json({
      ok: true,
      message: 'Usuario creado correctamente',
      data: usuario,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/usuarios/:id/rol
 */
async function cambiarRol(req, res, next) {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const usuario = await adminService.cambiarRol(id, rol);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Rol actualizado correctamente',
      data: usuario,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dashboard,
  listarUsuarios,
  crearUsuario,
  cambiarRol,
};
