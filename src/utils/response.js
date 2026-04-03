const ok = (res, data = null, message = 'OK', status = 200, meta = null) => {
  const response = {
    ok: true,
    message,
    data,
  };

  if (meta) response.meta = meta;

  return res.status(status).json(response);
};

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