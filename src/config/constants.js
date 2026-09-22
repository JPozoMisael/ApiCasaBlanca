const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  APP_NAME: process.env.APP_NAME || 'Salinas Booking',

  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    RECEPCION: 'recepcion',
    CLIENTE: 'cliente',
  },

  ESTADOS_RESERVA: ['pendiente', 'confirmada', 'check_in', 'check_out', 'cancelada', 'no_show'],

  // Estados que bloquean inventario.
  ESTADOS_RESERVA_ACTIVOS: ['pendiente', 'confirmada', 'check_in'],

  ESTADOS_PAGO: ['pendiente', 'aprobado', 'rechazado', 'anulado'],

  // IVA Ecuador (15 % vigente desde abril 2024). Configurable por entorno.
  IVA_PORCENTAJE: num(process.env.IVA_PORCENTAJE, 15),

  // Minutos que una reserva pendiente de pago retiene el inventario.
  RETENCION_MINUTOS: num(process.env.RETENCION_MINUTOS, 30),

  // Límites de negocio
  MAX_NOCHES: num(process.env.MAX_NOCHES, 30),
  MAX_DIAS_ANTICIPACION: num(process.env.MAX_DIAS_ANTICIPACION, 540),
  // Reservas web activas (pendiente/confirmada, no vencidas) por huésped/correo: frena el bloqueo masivo de inventario.
  MAX_RESERVAS_ACTIVAS_WEB: num(process.env.MAX_RESERVAS_ACTIVAS_WEB, 5),
  MAX_HABITACIONES_POR_RESERVA: num(process.env.MAX_HABITACIONES_POR_RESERVA, 6),

  TIMEZONE: 'America/Guayaquil',
};
