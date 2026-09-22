const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const { limiterLogin } = require('../middleware/rateLimit.middleware');
const S = require('../validators/schemas');
const authService = require('../services/auth.service');
const rbac = require('../services/rbac.service');

const router = express.Router();

router.post(
  '/login',
  limiterLogin,
  validate(S.login),
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    res.json({ ok: true, message: 'Login exitoso', data });
  })
);

router.post(
  '/register',
  limiterLogin,
  validate(S.register),
  asyncHandler(async (req, res) => {
    const usuario = await authService.register(req.body);
    res.status(201).json({ ok: true, message: 'Cuenta creada', data: usuario });
  })
);

router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await authService.perfil(req.user.id) });
  })
);

// Menú lateral y permisos del usuario en sesión (definidos en la base de datos).
router.get(
  '/menu',
  auth,
  asyncHandler(async (req, res) => {
    const menu = await rbac.menuPara(req.user.rol);
    res.json({
      ok: true,
      data: { rol: req.user.rol, alcance: req.user.alcance, permisos: [...req.user.permisos], menu },
    });
  })
);

router.patch(
  '/me',
  auth,
  validate(S.perfilUpdate),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: await authService.actualizarPerfil(req.user.id, req.body) });
  })
);

router.post(
  '/change-password',
  auth,
  validate(S.cambiarPassword),
  asyncHandler(async (req, res) => {
    await authService.cambiarPassword(req.user.id, req.body);
    res.json({ ok: true, message: 'Contraseña actualizada' });
  })
);

module.exports = router;
