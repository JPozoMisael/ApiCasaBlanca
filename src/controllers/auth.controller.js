const authService = require('../services/auth.service');

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const resultado = await authService.login({ email, password });

    res.status(200).json({
      ok: true,
      message: 'Login exitoso',
      token: resultado.token,
      usuario: resultado.usuario,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
};
