function redondear(valor, decimales = 2) {
  return Number(Number(valor).toFixed(decimales));
}

function esMontoValido(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

module.exports = {
  redondear,
  esMontoValido,
};
