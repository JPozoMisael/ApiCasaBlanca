module.exports = (err, req, res, next) => {
  // Errores conocidos de Sequelize → respuestas HTTP con sentido.
  let status = err.statusCode || err.status || 500;
  let message = err.message;
  let code = err.code && typeof err.code === 'string' && !err.code.startsWith('ER_') ? err.code : undefined;

  if (err.name === 'SequelizeValidationError') {
    status = 422;
    message = err.errors.map((e) => e.message).join(', ');
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    message = 'Ya existe un registro con esos datos';
    code = 'DUPLICADO';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    message = 'El registro está relacionado con otros datos y no se puede modificar o eliminar';
    code = 'RELACION_EXISTENTE';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  }

  if (status >= 500) {
    console.error('Error:', err);
    message = 'Error interno del servidor';
  }

  res.status(status).json({
    ok: false,
    message: message || 'Ocurrió un error',
    code,
    details: err.details || undefined,
    stack: process.env.NODE_ENV === 'development' && status >= 500 ? err.stack : undefined,
  });
};
