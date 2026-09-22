function redondear(valor, decimales = 2) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** decimales;
  // el epsilon evita 1.005 → 1.00
  return Math.round((n + Number.EPSILON) * f) / f;
}

function esMontoValido(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0;
}

module.exports = { redondear, esMontoValido };
