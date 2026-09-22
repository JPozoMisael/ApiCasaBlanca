const { AppError } = require('./errors');

const MS_DIA = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Todas las fechas de negocio son "solo fecha" (YYYY-MM-DD) y se operan en UTC
// para evitar corrimientos por zona horaria del servidor.
function aFecha(iso) {
  if (typeof iso !== 'string' || !ISO_DATE.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // rechaza 2026-02-31 → 2026-03-03
  return d.toISOString().slice(0, 10) === iso ? d : null;
}

function esFechaValida(iso) {
  return aFecha(iso) !== null;
}

function sumarDias(iso, dias) {
  const d = aFecha(iso);
  if (!d) return null;
  return new Date(d.getTime() + dias * MS_DIA).toISOString().slice(0, 10);
}

function diasEntre(inicio, fin) {
  const a = aFecha(inicio);
  const b = aFecha(fin);
  if (!a || !b) return 0;
  const diff = Math.round((b - a) / MS_DIA);
  return diff > 0 ? diff : 0;
}

// Fecha de hoy en Ecuador continental (UTC-5, sin horario de verano).
function hoyISO() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Lista de noches [entrada, salida): cada elemento es la fecha de la noche.
function nochesDelRango(entrada, salida) {
  const total = diasEntre(entrada, salida);
  const noches = [];
  for (let i = 0; i < total; i += 1) noches.push(sumarDias(entrada, i));
  return noches;
}

// 0=domingo … 6=sábado
function diaSemana(iso) {
  return aFecha(iso).getUTCDay();
}

// Valida y normaliza un rango de estadía. Lanza AppError 400 si es inválido.
function validarRango(entrada, salida, { maxNoches = 30, maxAnticipacion = 540 } = {}) {
  if (!esFechaValida(entrada) || !esFechaValida(salida)) {
    throw new AppError('Fechas inválidas: usa el formato YYYY-MM-DD', 400, 'FECHAS_INVALIDAS');
  }
  const noches = diasEntre(entrada, salida);
  if (noches < 1) {
    throw new AppError('La salida debe ser posterior a la entrada', 400, 'RANGO_INVALIDO');
  }
  if (noches > maxNoches) {
    throw new AppError(`La estadía máxima es de ${maxNoches} noches`, 400, 'ESTADIA_MUY_LARGA');
  }
  if (entrada < hoyISO()) {
    throw new AppError('No puedes reservar fechas pasadas', 400, 'FECHA_PASADA');
  }
  if (diasEntre(hoyISO(), entrada) > maxAnticipacion) {
    throw new AppError('La fecha de entrada está demasiado lejana', 400, 'FECHA_LEJANA');
  }
  return noches;
}

module.exports = {
  aFecha,
  esFechaValida,
  sumarDias,
  diasEntre,
  hoyISO,
  nochesDelRango,
  diaSemana,
  validarRango,
};
