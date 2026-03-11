const { models } = require('../models');

const registrar = (data) => models.AuditLog.create(data);

const listar = (filtros = {}) => {
  const where = {};
  if (filtros.user_id) where.user_id = filtros.user_id;
  if (filtros.action) where.action = filtros.action;

  return models.AuditLog.findAll({
    where,
    order: [['id', 'DESC']],
  });
};

module.exports = { registrar, listar };
