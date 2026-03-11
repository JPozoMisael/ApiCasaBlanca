// src/utils/response.js

/**
 * Respuesta exitosa estándar
 */
const ok = (res, data = null, message = 'OK', status = 200) => {
  return res.status(status).json({
    ok: true,
    message,
    data,
  });
};

/**
 * Respuesta de error controlado
 */
const fail = (res, message = 'Error', status = 400, error = null) => {
  return res.status(status).json({
    ok: false,
    message,
    error,
  });
};

module.exports = {
  ok,
  fail,
};
