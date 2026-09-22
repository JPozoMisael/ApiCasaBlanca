// validate(schema)            → valida req.body
// validate(schema, 'query')   → valida req.query (los valores convertidos van a req.valid.query)
module.exports = (schema, source = 'body') => (req, res, next) => {
  if (!schema) return next();

  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return res.status(422).json({
      ok: false,
      message: 'Validación fallida',
      details: error.details.map((d) => ({
        campo: d.path.join('.'),
        mensaje: d.message,
      })),
    });
  }

  if (source === 'body') req.body = value;
  else {
    // En Express 5 req.query es de solo lectura; guardamos el resultado aparte.
    req.valid = { ...(req.valid || {}), [source]: value };
  }
  next();
};
