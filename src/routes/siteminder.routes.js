const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { procesar } = require('../integrations/siteminder/entrada.service');

/*
| Endpoint global que SiteMinder llama (SOAP 1.1, text/xml). Sirve a todos los hoteles conectados:
| el hotel se identifica con el HotelCode de cada mensaje. La autenticación es WS-Security (UsernameToken)
| con SITEMINDER_USER / SITEMINDER_PASSWORD.
|   POST /api/v1/channels/siteminder
*/
const router = express.Router();

router.post(
  '/siteminder',
  express.text({ type: ['text/xml', 'application/soap+xml', 'application/xml', 'text/plain'], limit: '5mb' }),
  asyncHandler(async (req, res) => {
    if (typeof req.body !== 'string' || !req.body.trim()) {
      return res.status(415).type('text/plain').send('Se esperaba un mensaje SOAP 1.1 con Content-Type: text/xml');
    }
    const { status, xml } = await procesar(req.body);
    res.status(status).type(status === 200 ? 'text/xml; charset=utf-8' : 'text/plain').send(xml);
  })
);

module.exports = router;
