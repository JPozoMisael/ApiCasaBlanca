const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const S = require('../validators/schemas');
const { models } = require('../models');
const valoraciones = require('../services/valoraciones.service');
const { AppError } = require('../utils/errors');

// Funciones de la cuenta del huésped: reseñas y favoritos.
const router = express.Router();

router.post(
  '/reviews',
  auth,
  validate(S.crearValoracion),
  asyncHandler(async (req, res) => {
    const data = await valoraciones.crear(req.body, req.user);
    res.status(201).json({ ok: true, message: '¡Gracias por tu opinión!', data });
  })
);

router.get(
  '/favorites',
  auth,
  asyncHandler(async (req, res) => {
    const data = await models.Favorito.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: models.Hotel,
          as: 'hotel',
          attributes: ['id', 'slug', 'nombre', 'imagen_principal', 'estrellas', 'rating_promedio', 'total_valoraciones'],
          include: [{ model: models.Zona, as: 'zona', attributes: ['nombre', 'slug'] }],
        },
      ],
      order: [['id', 'DESC']],
    });
    res.json({ ok: true, data });
  })
);

router.put(
  '/favorites/:hotelId',
  auth,
  asyncHandler(async (req, res) => {
    const hotel = await models.Hotel.findOne({ where: { id: req.params.hotelId, estado: 'activo' }, attributes: ['id'] });
    if (!hotel) throw new AppError('Alojamiento no encontrado', 404);
    await models.Favorito.findOrCreate({ where: { user_id: req.user.id, hotel_id: hotel.id } });
    res.json({ ok: true, message: 'Agregado a favoritos' });
  })
);

router.delete(
  '/favorites/:hotelId',
  auth,
  asyncHandler(async (req, res) => {
    await models.Favorito.destroy({ where: { user_id: req.user.id, hotel_id: req.params.hotelId } });
    res.json({ ok: true, message: 'Quitado de favoritos' });
  })
);

module.exports = router;
