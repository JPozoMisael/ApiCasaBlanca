// src/controllers/reportes.controller.js
const reportesService = require('../services/reportes.service');

const dashboard = async (req, res, next) => {
  try {
    const data = await reportesService.getDashboard();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('Error dashboard:', err.message);
    next(err);
  }
};

module.exports = { dashboard };