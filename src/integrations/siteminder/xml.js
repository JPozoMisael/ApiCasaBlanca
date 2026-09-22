const { XMLParser } = require('fast-xml-parser');

/*
| SOAP 1.1 + OpenTravel (OTA 2003/05), tal como lo exige la API SiteConnect de SiteMinder:
| https://developer.siteminder.com/siteconnect-api/siteconnect-api.md
*/

const NS_OTA = 'http://www.opentravel.org/OTA/2003/05';
const NS_SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
const NS_WSSE = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';
const PASSWORD_TEXT = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText';

// Etiquetas que pueden repetirse: siempre se leen como arreglo.
const ARREGLOS = new Set([
  'AvailStatusMessage', 'LengthOfStay', 'RateAmountMessage', 'Rate', 'BaseByGuestAmt',
  'AdditionalGuestAmount', 'RoomStay', 'HotelReservation',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseAttributeValue: false, // los códigos (InvTypeCode="101") deben conservarse como texto
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  isArray: (nombre) => ARREGLOS.has(nombre),
});

const arreglo = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Interpreta un sobre SOAP.
 * @returns {{ usuario, password, operacion, cuerpo }} — `operacion` es el nombre del mensaje OTA (p. ej. OTA_HotelAvailNotifRQ)
 * @throws Error si no es un SOAP válido
 */
function leerSoap(xml) {
  let doc;
  try {
    doc = parser.parse(String(xml));
  } catch {
    throw new Error('XML mal formado');
  }
  const sobre = doc?.Envelope;
  if (!sobre?.Body) throw new Error('No es un mensaje SOAP 1.1');

  const token = sobre.Header?.Security?.UsernameToken;
  const password = token?.Password;
  const cuerpo = sobre.Body;
  const operacion = Object.keys(cuerpo).find((k) => !k.startsWith('@_') && !k.startsWith('?'));
  if (!operacion) throw new Error('El cuerpo SOAP está vacío');

  return {
    usuario: token?.Username ?? null,
    password: typeof password === 'object' ? password['#text'] ?? null : password ?? null,
    operacion,
    cuerpo: cuerpo[operacion],
  };
}

const marcaTiempo = () => new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

/** Respuesta OTA dentro de un sobre SOAP (encabezado vacío, como pide la especificación). */
function respuesta(nombreRS, echoToken, { errores = null, interior = '' } = {}) {
  const resultado = errores?.length
    ? `<Errors>${errores.map((e) => `<Error Type="${esc(e.tipo)}" Code="${esc(e.codigo)}">${esc(e.texto)}</Error>`).join('')}</Errors>`
    : `<Success/>${interior}`;
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="${NS_SOAP}"><SOAP-ENV:Header/><SOAP-ENV:Body>` +
    `<${nombreRS} xmlns="${NS_OTA}" EchoToken="${esc(echoToken)}" TimeStamp="${marcaTiempo()}" Version="1.0">${resultado}</${nombreRS}>` +
    `</SOAP-ENV:Body></SOAP-ENV:Envelope>`
  );
}

/** Sobre SOAP con encabezado WS-Security (UsernameToken) para mensajes salientes. */
function sobreConSeguridad(usuario, password, cuerpoXml) {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="${NS_SOAP}"><SOAP-ENV:Header>` +
    `<wsse:Security SOAP-ENV:mustUnderstand="1" xmlns:wsse="${NS_WSSE}"><wsse:UsernameToken>` +
    `<wsse:Username>${esc(usuario)}</wsse:Username>` +
    `<wsse:Password Type="${PASSWORD_TEXT}">${esc(password)}</wsse:Password>` +
    `</wsse:UsernameToken></wsse:Security></SOAP-ENV:Header>` +
    `<SOAP-ENV:Body>${cuerpoXml}</SOAP-ENV:Body></SOAP-ENV:Envelope>`
  );
}

module.exports = { leerSoap, respuesta, sobreConSeguridad, arreglo, esc, marcaTiempo, NS_OTA };
