const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const S = require('../validators/schemas');
const { buscarHoteles } = require('../services/busqueda.service');
const hoteles = require('../services/hoteles.service');
const valoraciones = require('../services/valoraciones.service');
const { models } = require('../models');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Catálogos
router.get(
  '/zonas',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await hoteles.listarZonas() }))
);

router.get(
  '/amenidades',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await hoteles.listarAmenidades() }))
);

// Buscador global: /search/hoteles?zona=chipipe&checkIn=2026-12-20&checkOut=2026-12-23&adultos=2&orden=precio_asc
router.get(
  '/search/hoteles',
  validate(S.buscar, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.valid.query;
    const resultado = await buscarHoteles({
      zona: q.zona,
      texto: q.q,
      entrada: q.checkIn,
      salida: q.checkOut,
      adultos: q.adultos,
      ninos: q.ninos,
      habitaciones: q.habitaciones,
      precioMin: q.precioMin,
      precioMax: q.precioMax,
      estrellasMin: q.estrellas,
      ratingMin: q.rating,
      tipos: q.tipos || [],
      amenidades: q.amenidades || [],
      orden: q.orden,
      page: q.page,
      limit: q.limit,
    });
    res.json({ ok: true, ...resultado });
  })
);

// Hoteles
router.get(
  '/hotels/featured',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await hoteles.destacados(Number(req.query.limit) || 8) }))
);

router.get(
  '/hotels/:slug',
  asyncHandler(async (req, res) => res.json({ ok: true, data: await hoteles.obtenerFicha(req.params.slug) }))
);

router.get(
  '/hotels/:slug/availability',
  validate(S.disponibilidad, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.valid.query;
    const data = await hoteles.disponibilidadHotel(req.params.slug, {
      entrada: q.checkIn,
      salida: q.checkOut,
      adultos: q.adultos,
      ninos: q.ninos,
    });
    res.json({ ok: true, data });
  })
);

router.get(
  '/hotels/:slug/reviews',
  validate(S.paginacion, 'query'),
  asyncHandler(async (req, res) => {
    const esId = /^\d+$/.test(req.params.slug);
    const hotel = await models.Hotel.findOne({
      where: esId ? { id: Number(req.params.slug) } : { slug: req.params.slug },
      attributes: ['id'],
    });
    if (!hotel) throw new AppError('Alojamiento no encontrado', 404);
    const r = await valoraciones.listarPorHotel(hotel.id, req.valid.query);
    res.json({ ok: true, ...r });
  })
);

module.exports = router;
