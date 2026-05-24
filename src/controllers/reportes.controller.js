const reportesService = require('../services/reportes.service');

// =============================================
// DASHBOARD PRINCIPAL
// GET /api/v1/reportes/dashboard
// =============================================
const dashboard = async (req, res, next) => {
  try {
    const data = await reportesService.getDashboard();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error dashboard:', err.message);
    next(err);
  }
};

// =============================================
// OCUPACIÓN POR FECHAS
// GET /api/v1/reportes/ocupacion?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&hotel_id=1
// =============================================
const ocupacion = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin, hotel_id } = req.query;

    // Validar fechas
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        ok: false,
        message: 'fecha_inicio y fecha_fin son requeridos'
      });
    }

    const data = await reportesService.getOcupacion({ 
      fecha_inicio, 
      fecha_fin, 
      hotel_id: hotel_id ? Number(hotel_id) : null 
    });
    
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error ocupación:', err.message);
    next(err);
  }
};

// =============================================
// INGRESOS POR PERÍODO
// GET /api/v1/reportes/ingresos?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&hotel_id=1
// =============================================
const ingresos = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin, hotel_id } = req.query;

    // Validar fechas
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        ok: false,
        message: 'fecha_inicio y fecha_fin son requeridos'
      });
    }

    const data = await reportesService.getIngresos({ 
      fecha_inicio, 
      fecha_fin, 
      hotel_id: hotel_id ? Number(hotel_id) : null 
    });
    
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error ingresos:', err.message);
    next(err);
  }
};

// =============================================
// RESERVAS POR ESTADO
// GET /api/v1/reportes/reservas/estado?hotel_id=1
// =============================================
const reservasPorEstado = async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    const data = await reportesService.getReservasPorEstado(hotel_id ? Number(hotel_id) : null);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error reservas por estado:', err.message);
    next(err);
  }
};

// =============================================
// HOTELES MÁS RESERVADOS
// GET /api/v1/reportes/hoteles/top?limit=10
// =============================================
const hotelesTop = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await reportesService.getHotelesTop(limit);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error hoteles top:', err.message);
    next(err);
  }
};

// =============================================
// SERVICIOS MÁS CONTRATADOS
// GET /api/v1/reportes/servicios/top?limit=10
// =============================================
const serviciosTop = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await reportesService.getServiciosTop(limit);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error servicios top:', err.message);
    next(err);
  }
};

// =============================================
// CLIENTES FRECUENTES
// GET /api/v1/reportes/clientes/frecuentes?limit=10
// =============================================
const clientesFrecuentes = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await reportesService.getClientesFrecuentes(limit);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error clientes frecuentes:', err.message);
    next(err);
  }
};

// =============================================
// CANCELACIONES POR PERÍODO
// GET /api/v1/reportes/cancelaciones?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&hotel_id=1
// =============================================
const cancelaciones = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin, hotel_id } = req.query;

    // Validar fechas
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        ok: false,
        message: 'fecha_inicio y fecha_fin son requeridos'
      });
    }

    const data = await reportesService.getCancelaciones({ 
      fecha_inicio, 
      fecha_fin, 
      hotel_id: hotel_id ? Number(hotel_id) : null 
    });
    
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error cancelaciones:', err.message);
    next(err);
  }
};

// =============================================
// EXPORTS
// =============================================
module.exports = { 
  dashboard,
  ocupacion,
  ingresos,
  reservasPorEstado,
  hotelesTop,
  serviciosTop,
  clientesFrecuentes,
  cancelaciones
};