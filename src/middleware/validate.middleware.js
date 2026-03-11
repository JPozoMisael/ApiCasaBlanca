module.exports = (schema) => {
  return (req, res, next) => {
    if (!schema) return next();

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(422).json({
        ok: false,
        message: 'Validación fallida',
        details: error.details.map((d) => d.message),
      });
    }

    req.body = value;
    next();
  };
};
