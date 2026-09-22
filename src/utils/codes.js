const crypto = require('crypto');

// Sin 0/O/1/I/L para que el código se pueda dictar por teléfono.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function codigoAleatorio(longitud = 8) {
  const bytes = crypto.randomBytes(longitud);
  let out = '';
  for (let i = 0; i < longitud; i += 1) out += ALFABETO[bytes[i] % ALFABETO.length];
  return out;
}

function generarCodigoReserva() {
  return `SB-${codigoAleatorio(8)}`;
}

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

module.exports = { codigoAleatorio, generarCodigoReserva, slugify };
