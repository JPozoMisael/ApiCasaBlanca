const clientesService = require('../services/clientes.service');

async function listar(req, res, next) {
  try {
    const clientes = await clientesService.listarClientes();

    res.status(200).json({
      ok: true,
      data: clientes,
      meta: { total: clientes.length },
    });

  } catch (error) {
    console.error('Error listar clientes:', error.message);
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error obtener cliente:', error.message);
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const cliente = await clientesService.crearCliente(req.body);

    res.status(201).json({
      ok: true,
      message: 'Cliente creado correctamente',
      data: cliente,
    });

  } catch (error) {
    console.error('Error crear cliente:', error.message);
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error actualizar cliente:', error.message);
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido',
      });
    }

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
    console.error('Error eliminar cliente:', error.message);
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