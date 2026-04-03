function diasEntre(fechaInicio, fechaFin) {
  const a = new Date(fechaInicio);
  const b = new Date(fechaFin);

  if (isNaN(a) || isNaN(b)) return 0;

  const ms = b - a;

  if (ms <= 0) return 0;

  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function hoyISO() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

module.exports = {
  diasEntre,
  hoyISO,
};