const { models } = require('../models');

async function registrarEvento({
  action,
  user_id = null,
  target_id = null,
  target_type = null,
  old_value = null,
  new_value = null,
  details = null,
  ip_address = null,
  user_agent = null,
}) {
  return models.AuditLog.create({
    action,
    user_id,
    target_id,
    target_type,
    old_value,
    new_value,
    details,
    ip_address,
    user_agent,
  });
}

async function listar(filtros = {}) {
  const where = {};
  if (filtros.user_id) where.user_id = filtros.user_id;
  if (filtros.action) where.action = filtros.action;

  return models.AuditLog.findAll({ where, order: [['id', 'DESC']] });
}

module.exports = { registrarEvento, listar };
