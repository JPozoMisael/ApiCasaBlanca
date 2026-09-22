const express = require('express');
const asyncHandler = require('./asyncHandler');
const { AppError } = require('./errors');
const validate = require('../middleware/validate.middleware');
const { auth } = require('../middleware/auth.middleware');
const { permiso, tienePermiso } = require('../middleware/roles.middleware');
const { tenant, filtroHotel, hotelObligatorio, verificarPertenencia } = require('../middleware/tenant.middleware');

/*
| Genera el router CRUD de un recurso que pertenece a un hotel (tabla con hotel_id).
| Garantiza el aislamiento entre hoteles y valida que las FK enviadas (tipo de habitación,
| temporada…) sean del mismo hotel.
|
| opciones:
|   Model, schemas: { crear, actualizar }
|   filtros         campos de ?query que se aplican como igualdad
|   relaciones      { campo: Model } — el registro referenciado debe ser del mismo hotel
|   include, orden
|   lectura / escritura / edicion   permisos requeridos (escritura = crear y borrar; edicion = editar, por defecto = escritura)
|   edicionParcial  { requiere, campos }: sin ese permiso solo se pueden editar esos campos
|   antesDeBorrar   async (registro) => boolean|void — devolver true = ya se manejó (p. ej. desactivar)
*/
module.exports = function crudHotel({
  Model,
  schemas,
  filtros = [],
  relaciones = {},
  include = [],
  orden = [['id', 'DESC']],
  lectura,
  escritura,
  edicion = escritura,
  edicionParcial,
  antesDeBorrar,
}) {
  const router = express.Router();
  router.use(auth, tenant);

  async function validarRelaciones(body, hotelId) {
    for (const [campo, Rel] of Object.entries(relaciones)) {
      if (body[campo] === undefined || body[campo] === null) continue;
      const rel = await Rel.findByPk(body[campo], { attributes: ['id', 'hotel_id'] });
      if (!rel || rel.hotel_id !== hotelId) {
        throw new AppError(`${campo} no pertenece a este hotel`, 400, 'RELACION_INVALIDA');
      }
    }
  }

  router.get(
    '/',
    permiso(...lectura),
    asyncHandler(async (req, res) => {
      const where = { ...filtroHotel(req) };
      for (const f of filtros) if (req.query[f] !== undefined && req.query[f] !== '') where[f] = req.query[f];
      const data = await Model.findAll({ where, include, order: orden });
      res.json({ ok: true, data, meta: { total: data.length } });
    })
  );

  router.get(
    '/:id',
    permiso(...lectura),
    asyncHandler(async (req, res) => {
      const registro = await Model.findByPk(req.params.id, { include });
      res.json({ ok: true, data: verificarPertenencia(req, registro) });
    })
  );

  router.post(
    '/',
    permiso(...escritura),
    validate(schemas.crear),
    asyncHandler(async (req, res) => {
      const hotelId = hotelObligatorio(req);
      await validarRelaciones(req.body, hotelId);
      const data = await Model.create({ ...req.body, hotel_id: hotelId });
      res.status(201).json({ ok: true, data });
    })
  );

  router.put(
    '/:id',
    permiso(...edicion),
    validate(schemas.actualizar),
    asyncHandler(async (req, res) => {
      const registro = verificarPertenencia(req, await Model.findByPk(req.params.id));
      if (edicionParcial && !tienePermiso(req.user, edicionParcial.requiere)) {
        const extra = Object.keys(req.body).filter((k) => !edicionParcial.campos.includes(k));
        if (extra.length) {
          throw new AppError(`Con tu rol solo puedes modificar: ${edicionParcial.campos.join(', ')}`, 403, 'PERMISOS_INSUFICIENTES');
        }
      }
      await validarRelaciones(req.body, registro.hotel_id);
      await registro.update(req.body);
      res.json({ ok: true, data: registro });
    })
  );

  router.delete(
    '/:id',
    permiso(...escritura),
    asyncHandler(async (req, res) => {
      const registro = verificarPertenencia(req, await Model.findByPk(req.params.id));
      const manejado = antesDeBorrar ? await antesDeBorrar(registro) : false;
      if (!manejado) await registro.destroy();
      res.json({ ok: true, message: manejado ? 'Registro desactivado' : 'Registro eliminado' });
    })
  );

  return router;
};
