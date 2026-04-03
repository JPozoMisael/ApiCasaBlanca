function redondear(valor, decimales = 2) {
  const n = Number(valor);

  if (!Number.isFinite(n)) return 0;

  return Number(n.toFixed(decimales));
}

function esMontoValido(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

module.exports = {
  redondear,
  esMontoValido,
};