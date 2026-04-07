// src/services/hoteles.service.js
const Hotel = require('../models/Hotel');

async function listarHoteles() {
  const hoteles = await Hotel.findAll({
    order: [['created_at', 'DESC']],
  });
  return hoteles;
}

async function obtenerHotelPorId(id) {
  const hotel = await Hotel.findByPk(id);
  return hotel || null;
}

async function crearHotel(data) {
  const hotel = await Hotel.create(data);
  return hotel;
}

async function actualizarHotel(id, data) {
  const hotel = await Hotel.findByPk(id);
  if (!hotel) return null;

  await hotel.update(data);
  return hotel;
}

async function eliminarHotel(id) {
  const hotel = await Hotel.findByPk(id);
  if (!hotel) return null;

  await hotel.destroy();
  return true;
}

module.exports = {
  listarHoteles,
  obtenerHotelPorId,
  crearHotel,
  actualizarHotel,
  eliminarHotel,
};