module.exports = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  console.error('❌ Error:', err);

  const status = err.statusCode || err.status || 500;

  // Mensaje seguro para producción
  const message =
    status >= 500
      ? 'Error interno del servidor'
      : err.message || 'Ocurrió un error';

  // En desarrollo, muestra detalles
  const details =
    process.env.NODE_ENV === 'development'
      ? { stack: err.stack, name: err.name }
      : undefined;

  res.status(status).json({
    ok: false,
    message,
    details,
  });
};
