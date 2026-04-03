module.exports = (err, req, res, next) => {
  console.error('❌ Error:', err);

  const status = err.statusCode || err.status || 500;

  let message =
    status >= 500
      ? 'Error interno del servidor'
      : err.message || 'Ocurrió un error';

  // Manejo Sequelize
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map((e) => e.message).join(', ');
  }

  const details =
    process.env.NODE_ENV === 'development'
      ? {
          stack: err.stack,
          name: err.name,
        }
      : undefined;

  res.status(status).json({
    ok: false,
    message,
    details,
  });
};