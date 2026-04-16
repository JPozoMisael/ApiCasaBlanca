const hotelesService = require('../services/hoteles.service');

async function listar(req, res, next) {
  try {
    const hoteles = await hotelesService.listarHoteles();

    res.status(200).json({
      ok: true,
      data: hoteles,
      meta: { total: hoteles.length },
    });

  } catch (error) {
    console.error('Error listar hoteles:', error.message);
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

    const hotel = await hotelesService.obtenerHotelPorId(id);

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      data: hotel,
    });

  } catch (error) {
    console.error('Error obtener hotel:', error.message);
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const hotel = await hotelesService.crearHotel(req.body);

    res.status(201).json({
      ok: true,
      message: 'Hotel creado correctamente',
      data: hotel,
    });

  } catch (error) {
    console.error('Error crear hotel:', error.message);
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

    const hotel = await hotelesService.actualizarHotel(id, req.body);

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Hotel actualizado correctamente',
      data: hotel,
    });

  } catch (error) {
    console.error('Error actualizar hotel:', error.message);
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

    const okDelete = await hotelesService.eliminarHotel(id);

    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Hotel eliminado correctamente',
    });

  } catch (error) {
    console.error('Error eliminar hotel:', error.message);
    next(error);
  }
}

/* ================= RESUMEN ================= */

async function resumen(req, res, next) {
  try {
    const data = await hotelesService.obtenerResumenHoteles();

    res.status(200).json({
      ok: true,
      data,
      meta: { total: data.length },
    });

  } catch (error) {
    console.error('Error resumen hoteles:', error.message);
    next(error);
  }
}


async function obtenerPorSlug(req, res, next) {
  try {
    const { slug } = req.params;

    const hotel = await hotelesService.obtenerPorSlug(slug);

    if (!hotel) {
      return res.status(404).json({
        ok: false,
        message: 'Hotel no encontrado',
      });
    }

    res.status(200).json({
      ok: true,
      data: hotel,
    });

  } catch (error) {
    console.error('Error obtener por slug:', error.message);
    next(error);
  }
}
module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  resumen, 
  obtenerPorSlug
};