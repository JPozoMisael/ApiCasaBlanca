const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    target_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    target_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50],
      },
    },

    old_value: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    new_value: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },

    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        len: [0, 45],
      },
    },

    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_audit_action', fields: ['action'] },
      { name: 'idx_audit_user_id', fields: ['user_id'] },
      { name: 'idx_audit_created_at', fields: ['created_at'] },
      { name: 'idx_audit_target', fields: ['target_type', 'target_id'] },
    ],
  }
);

module.exports = AuditLog;