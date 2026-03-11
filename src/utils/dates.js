// src/utils/dates.js

function diasEntre(fechaInicio, fechaFin) {
  const a = new Date(fechaInicio);
  const b = new Date(fechaFin);
  const ms = b - a;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

module.exports = {
  diasEntre,
  hoyISO,
};
