const pagosService = require('../services/pagos.service');

// =============================================
// CRUD BÁSICO
// =============================================

// LISTAR PAGOS
async function listar(req, res, next) {
  try {
    const filtros = {
      reserva_id: req.query.reserva_id,
      estado: req.query.estado,
      metodo: req.query.metodo
    };
    
    const pagos = await pagosService.listarPagos(filtros);
    
    return res.status(200).json({
      ok: true,
      data: pagos,
      meta: { total: pagos.length }
    });
  } catch (error) {
    console.error('Error listar pagos:', error.message);
    next(error);
  }
}

// OBTENER PAGO POR ID
async function obtenerPorId(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido'
      });
    }
    
    const pago = await pagosService.obtenerPagoPorId(id);
    
    if (!pago) {
      return res.status(404).json({
        ok: false,
        message: 'Pago no encontrado'
      });
    }
    
    return res.status(200).json({
      ok: true,
      data: pago
    });
  } catch (error) {
    console.error('Error obtener pago:', error.message);
    next(error);
  }
}

// ACTUALIZAR PAGO
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido'
      });
    }
    
    const pago = await pagosService.actualizarPago(id, req.body);
    
    if (!pago) {
      return res.status(404).json({
        ok: false,
        message: 'Pago no encontrado'
      });
    }
    
    return res.status(200).json({
      ok: true,
      message: 'Pago actualizado correctamente',
      data: pago
    });
  } catch (error) {
    console.error('Error actualizar pago:', error.message);
    next(error);
  }
}

// ELIMINAR PAGO
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'ID inválido'
      });
    }
    
    const okDelete = await pagosService.eliminarPago(id);
    
    if (!okDelete) {
      return res.status(404).json({
        ok: false,
        message: 'Pago no encontrado'
      });
    }
    
    return res.status(200).json({
      ok: true,
      message: 'Pago eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminar pago:', error.message);
    next(error);
  }
}

// =============================================
// MÉTODOS DE PAGO (existentes)
// =============================================

// INICIAR PAGO - Crea intención de pago y retorna botón
async function iniciarPago(req, res, next) {
  try {
    const { reserva_id, metodo } = req.body;
    const usuario_id = req.user.id;

    const resultado = await pagosService.iniciarPago({
      reserva_id,
      metodo,
      usuario_id
    });

    return res.status(200).json({
      ok: true,
      data: resultado,
      message: 'Iniciar pago'
    });
  } catch (error) {
    console.error('Error iniciar pago:', error.message);
    next(error);
  }
}

// CONFIRMAR PAGO - Webhook para confirmaciones asíncronas
async function confirmarPago(req, res, next) {
  try {
    const { pago_id, transaction_id, gateway } = req.body;

    const resultado = await pagosService.confirmarPago({
      pago_id,
      transaction_id,
      gateway
    });

    return res.status(200).json({
      ok: true,
      data: resultado,
      message: 'Pago confirmado'
    });
  } catch (error) {
    console.error('Error confirmar pago:', error.message);
    next(error);
  }
}

// VERIFICAR ESTADO DE PAGO
async function verificarEstado(req, res, next) {
  try {
    const { pago_id } = req.params;

    const estado = await pagosService.verificarEstado(Number(pago_id));

    return res.status(200).json({
      ok: true,
      data: estado
    });
  } catch (error) {
    console.error('Error verificar estado:', error.message);
    next(error);
  }
}

// WEBHOOK PARA STRIPE
async function webhookStripe(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    const resultado = await pagosService.procesarWebhookStripe({
      payload: req.body,
      signature
    });

    return res.status(200).json({ ok: true, received: true });
  } catch (error) {
    console.error('Error webhook Stripe:', error.message);
    return res.status(400).json({ ok: false, message: error.message });
  }
}

// WEBHOOK PARA PAYPAL
async function webhookPaypal(req, res, next) {
  try {
    const resultado = await pagosService.procesarWebhookPaypal(req.body);
    return res.status(200).json({ ok: true, received: true });
  } catch (error) {
    console.error('Error webhook PayPal:', error.message);
    return res.status(400).json({ ok: false, message: error.message });
  }
}

// REEMBOLSAR PAGO
async function reembolsar(req, res, next) {
  try {
    const { pago_id, monto, motivo } = req.body;
    const usuario_id = req.user.id;

    const resultado = await pagosService.reembolsar({
      pago_id,
      monto,
      motivo,
      usuario_id
    });

    return res.status(200).json({
      ok: true,
      data: resultado,
      message: 'Reembolso procesado'
    });
  } catch (error) {
    console.error('Error reembolsar:', error.message);
    next(error);
  }
}

// MÉTODOS DE PAGO DISPONIBLES
async function metodosDisponibles(req, res, next) {
  try {
    const metodos = await pagosService.getMetodosDisponibles();
    return res.status(200).json({ ok: true, data: metodos });
  } catch (error) {
    console.error('Error métodos:', error.message);
    next(error);
  }
}

// HISTORIAL DE PAGOS POR CLIENTE
async function historialCliente(req, res, next) {
  try {
    const cliente_id = req.user.cliente_id || req.params.cliente_id;
    const { page = 1, limit = 10 } = req.query;

    const historial = await pagosService.getHistorialCliente({
      cliente_id,
      page: Number(page),
      limit: Number(limit)
    });

    return res.status(200).json({ ok: true, data: historial });
  } catch (error) {
    console.error('Error historial cliente:', error.message);
    next(error);
  }
}

// GENERAR FACTURA PDF
async function generarFactura(req, res, next) {
  try {
    const { pago_id } = req.params;
    const factura = await pagosService.generarFactura(Number(pago_id));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${pago_id}.pdf`);
    return res.send(factura);
  } catch (error) {
    console.error('Error generar factura:', error.message);
    next(error);
  }
}

module.exports = {
  // CRUD básico
  listar,
  obtenerPorId,
  actualizar,
  eliminar,
  // Pagos sólidos
  iniciarPago,
  confirmarPago,
  verificarEstado,
  webhookStripe,
  webhookPaypal,
  reembolsar,
  metodosDisponibles,
  historialCliente,
  generarFactura
};