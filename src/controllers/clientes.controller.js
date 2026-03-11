const clientesService = require('../services/clientes.service');

/**
 * GET /api/v1/clientes
 * Protegido (admin/empleado)
 * Opcional: ?q=texto para buscar por nombre/apellido/email/documento
 */
async function listar(req, res, next) {
  try {
    const q = (req.query.q || '').trim();

    const data = q
      ? await clientesService.buscarClientes(q)
      : await clientesService.listarClientes();

    res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/clientes/:id
 * Protegido (admin/empleado)
 */
async function obtenerPorId(req, res, next) {
  try {
    const { id } = req.params;

    const cliente = await clientesService.obtenerClientePorId(id);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      data: cliente,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/clientes
 * Público (registro rápido) o Protegido (admin/empleado)
 */
async function crear(req, res, next) {
  try {
    const cliente = await clientesService.crearCliente(req.body);

    res.status(201).json({
      ok: true,
      message: 'Cliente creado correctamente',
      data: cliente,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/clientes/:id
 * Protegido (admin/empleado)
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;

    const cliente = await clientesService.actualizarCliente(id, req.body);

    if (!cliente) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Cliente actualizado correctamente',
      data: cliente,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/clientes/:id
 * Protegido (admin/empleado) (si lo quieres solo admin, lo controlas en routes)
 */
async function eliminar(req, res, next) {
  try {
    const { id } = req.params;

    const okDelete = await clientesService.eliminarCliente(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Cliente eliminado correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
