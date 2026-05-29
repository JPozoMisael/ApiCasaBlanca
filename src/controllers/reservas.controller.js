const reservasService = require('../services/reservas.service');

async function crear(req, res, next) {
  try {
    const resultado = await reservasService.crearReserva(req.body);
    res.status(201).json({ ok: true, message: 'Reserva creada correctamente', data: resultado });
  } catch (error) {
    console.error('Error crear reserva:', error.message);
    next(error);
  }
}

async function listar(req, res, next) {
  try {
    const filtros = {
      hotel_id: req.query.hotel_id,
      cliente_id: req.query.cliente_id,
      estado: req.query.estado,
    };
    const reservas = await reservasService.listarReservas(filtros);
    res.status(200).json({ ok: true, data: reservas, meta: { total: reservas.length } });
  } catch (error) {
    console.error('Error listar reservas:', error.message);
    next(error);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const reserva = await reservasService.obtenerReservaPorId(id);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, data: reserva });
  } catch (error) {
    console.error('Error obtener reserva:', error.message);
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const reserva = await reservasService.actualizarReserva(id, req.body);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, message: 'Reserva actualizada correctamente', data: reserva });
  } catch (error) {
    console.error('Error actualizar reserva:', error.message);
    next(error);
  }
}

async function cancelar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const reserva = await reservasService.cancelarReserva(id);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, message: 'Reserva cancelada correctamente', data: reserva });
  } catch (error) {
    console.error('Error cancelar reserva:', error.message);
    next(error);
  }
}

async function realizarCheckIn(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const reserva = await reservasService.realizarCheckIn(id);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, message: 'Check-in realizado correctamente', data: reserva });
  } catch (error) {
    console.error('Error realizar check-in:', error.message);
    next(error);
  }
}

async function realizarCheckOut(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const reserva = await reservasService.realizarCheckOut(id);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, message: 'Check-out realizado correctamente', data: reserva });
  } catch (error) {
    console.error('Error realizar check-out:', error.message);
    next(error);
  }
}

async function actualizarEstado(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'confirmada', 'check_in', 'check_out', 'cancelada', 'no_show'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`,
      });
    }

    const reserva = await reservasService.actualizarEstadoReserva(id, estado);
    if (!reserva) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }
    res.status(200).json({ ok: true, message: 'Estado actualizado correctamente', data: reserva });
  } catch (error) {
    console.error('Error actualizar estado:', error.message);
    next(error);
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  cancelar,
  realizarCheckIn,
  realizarCheckOut,
  actualizarEstado,
};