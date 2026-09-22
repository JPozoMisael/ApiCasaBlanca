const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Estados que bloquean inventario (la habitación no se puede vender a otro).
const ESTADOS_ACTIVOS = ['pendiente', 'confirmada', 'check_in'];

const Reserva = sequelize.define(
  'Reserva',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    hotel_id: { type: DataTypes.INTEGER, allowNull: false },

    // Usuario de la plataforma que reservó (null = invitado o creada por recepción)
    user_id: { type: DataTypes.INTEGER, allowNull: true },

    codigo_reserva: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    fecha_entrada: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_salida: { type: DataTypes.DATEONLY, allowNull: false },

    num_huespedes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },

    num_ninos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    estado: {
      type: DataTypes.ENUM(
        'pendiente',
        'confirmada',
        'check_in',
        'check_out',
        'cancelada',
        'no_show'
      ),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    canal: {
      type: DataTypes.ENUM('web', 'recepcion', 'telefono', 'whatsapp'),
      allowNull: false,
      defaultValue: 'web',
    },

    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
    impuestos: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
    precio_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },

    // Comisión de la plataforma calculada al reservar (snapshot del % del hotel).
    comision: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

    // Snapshot de la política vigente al momento de reservar.
    politica_cancelacion: {
      type: DataTypes.ENUM('flexible', 'moderada', 'estricta'),
      allowNull: false,
      defaultValue: 'moderada',
    },

    // Una reserva 'pendiente' sin pago retiene inventario hasta esta fecha.
    expira_en: { type: DataTypes.DATE, allowNull: true },

    cancelada_en: { type: DataTypes.DATE, allowNull: true },
    motivo_cancelacion: { type: DataTypes.STRING(300), allowNull: true },

    observaciones: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'reservas',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_reserva_hotel_fechas', fields: ['hotel_id', 'fecha_entrada', 'fecha_salida'] },
      { name: 'idx_reserva_cliente', fields: ['cliente_id'] },
      { name: 'idx_reserva_user', fields: ['user_id'] },
      { name: 'idx_reserva_estado', fields: ['estado'] },
    ],
    hooks: {
      beforeSave: (reserva) => {
        const subtotal = Number(reserva.subtotal || 0);
        const impuestos = Number(reserva.impuestos || 0);
        reserva.precio_total = (subtotal + impuestos).toFixed(2);
      },
    },
    validate: {
      fechasCoherentes() {
        if (
          this.fecha_entrada &&
          this.fecha_salida &&
          String(this.fecha_salida) <= String(this.fecha_entrada)
        ) {
          throw new Error('fecha_salida debe ser posterior a fecha_entrada');
        }
      },
    },
  }
);

Reserva.ESTADOS_ACTIVOS = ESTADOS_ACTIVOS;

module.exports = Reserva;
