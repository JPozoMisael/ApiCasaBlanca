const { sumarDias, hoyISO } = require('../utils/dates');
const { redondear } = require('../utils/money');

/*
| Política de cancelación por hotel. Días de anticipación para cancelar sin costo
| y penalización aplicada si se cancela después de ese límite.
*/
const POLITICAS = {
  flexible: {
    diasGratis: 1,
    penalizacion: 'primera_noche',
    descripcion: 'Cancelación gratuita hasta 1 día antes de la llegada. Después se cobra la primera noche.',
  },
  moderada: {
    diasGratis: 3,
    penalizacion: 'mitad',
    descripcion: 'Cancelación gratuita hasta 3 días antes de la llegada. Después se cobra el 50 % de la estadía.',
  },
  estricta: {
    diasGratis: 7,
    penalizacion: 'total',
    descripcion: 'Cancelación gratuita hasta 7 días antes de la llegada. Después se cobra el 100 % de la estadía.',
  },
};

function describirPolitica(nombre) {
  const p = POLITICAS[nombre] || POLITICAS.moderada;
  return { nombre: POLITICAS[nombre] ? nombre : 'moderada', ...p };
}

/**
 * @param {string} nombre        flexible | moderada | estricta
 * @param {object} reserva       { fecha_entrada, subtotal, primeraNoche }
 * @param {string} [hoy]         YYYY-MM-DD (inyectable para tests)
 */
function evaluarCancelacion(nombre, { fecha_entrada, subtotal, primeraNoche }, hoy = hoyISO()) {
  const politica = describirPolitica(nombre);
  const limiteGratis = sumarDias(fecha_entrada, -politica.diasGratis);
  const gratis = hoy <= limiteGratis;

  let penalizacion = 0;
  if (!gratis) {
    if (politica.penalizacion === 'primera_noche') penalizacion = Number(primeraNoche || 0);
    else if (politica.penalizacion === 'mitad') penalizacion = Number(subtotal) * 0.5;
    else penalizacion = Number(subtotal);
  }

  return {
    politica: politica.nombre,
    gratis,
    limite_cancelacion_gratis: limiteGratis,
    penalizacion: redondear(Math.min(penalizacion, Number(subtotal))),
  };
}

module.exports = { POLITICAS, describirPolitica, evaluarCancelacion };
