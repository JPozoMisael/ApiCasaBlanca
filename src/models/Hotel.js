const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TIPOS_ALOJAMIENTO = [
  'hotel',
  'hostal',
  'hosteria',
  'apart_hotel',
  'cabana',
  'villa',
  'departamento',
];

const Hotel = sequelize.define(
  'Hotel',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] },
    },

    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },

    zona_id: { type: DataTypes.INTEGER, allowNull: true },

    tipo_alojamiento: {
      type: DataTypes.ENUM(...TIPOS_ALOJAMIENTO),
      allowNull: false,
      defaultValue: 'hotel',
    },

    descripcion: { type: DataTypes.TEXT, allowNull: true },
    direccion: { type: DataTypes.STRING(200), allowNull: true },

    ciudad: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Salinas',
      validate: { notEmpty: true, len: [2, 50] },
    },

    pais: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Ecuador',
    },

    latitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitud: { type: DataTypes.DECIMAL(10, 7), allowNull: true },

    telefono: { type: DataTypes.STRING(20), allowNull: true },
    whatsapp: { type: DataTypes.STRING(20), allowNull: true },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: { isEmail: true },
    },

    sitio_web: { type: DataTypes.STRING(200), allowNull: true },

    estrellas: {
      type: DataTypes.TINYINT,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },

    imagen_principal: { type: DataTypes.STRING(500), allowNull: true },

    hora_checkin: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '14:00' },
    hora_checkout: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '12:00' },

    politica_cancelacion: {
      type: DataTypes.ENUM('flexible', 'moderada', 'estricta'),
      allowNull: false,
      defaultValue: 'moderada',
    },

    // Porcentaje que retiene la plataforma sobre cada reserva.
    comision_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      validate: { min: 0, max: 100 },
    },

    destacado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // Denormalizados: se recalculan al crear/editar reseñas.
    rating_promedio: { type: DataTypes.DECIMAL(3, 1), allowNull: false, defaultValue: 0 },
    total_valoraciones: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // pendiente = registrado por el hotel, aún no aprobado por la plataforma
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo', 'pendiente'),
      allowNull: false,
      defaultValue: 'activo',
    },
  },
  {
    tableName: 'hoteles',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_hotel_zona', fields: ['zona_id'] },
      { name: 'idx_hotel_estado', fields: ['estado'] },
    ],
  }
);

Hotel.TIPOS_ALOJAMIENTO = TIPOS_ALOJAMIENTO;

module.exports = Hotel;
