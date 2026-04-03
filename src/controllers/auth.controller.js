const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email y password son requeridos',
      });
    }

    const resultado = await authService.login({ email, password });

    return res.status(200).json({
      ok: true,
      message: 'Login exitoso',
      data: {
        token: resultado.token,
        usuario: resultado.usuario,
      },
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    next(error);
  }
}

module.exports = {
  login,
};