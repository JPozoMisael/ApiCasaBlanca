/*
| Siembra la base de datos.
|   npm run db:seed        → catálogos (zonas, amenidades) + super_admin + hoteles reales del proyecto
|   npm run db:seed:demo   → lo anterior + hoteles ficticios de muestra y reseñas
|   --reset                → BORRA todas las tablas y las recrea (solo fuera de producción)
|
| Es idempotente: si un registro ya existe, no lo duplica ni lo pisa.
| Variables opcionales: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_DEMO_PASSWORD
*/
require('dotenv').config();

const crypto = require('crypto');
const { sequelize, closeConnection } = require('../src/config/db');
const { models, applyAssociations } = require('../src/models');
const { slugify } = require('../src/utils/codes');
const rbac = require('../src/services/rbac.service');
const { recalcularRating } = require('../src/services/hoteles.service');
const { ZONAS, AMENIDADES, HOTELES, RESENAS_DEMO } = require('./seed-data');

const log = (...a) => console.log('[seed]', ...a);
const passwordAleatoria = () => crypto.randomBytes(9).toString('base64url');

async function sembrar({ demo = false, reset = false } = {}) {
  applyAssociations();

  if (reset) {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      throw new Error('--reset está deshabilitado en producción');
    }
    await sequelize.sync({ force: true });
    log('base de datos recreada');
  }

  const credenciales = [];

  // Roles, permisos y menú lateral (antes que los usuarios).
  await rbac.sincronizar();
  log('roles, permisos y menú');

  // ---------- Zonas ----------
  const zonaPorSlug = {};
  for (const z of ZONAS) {
    const slug = slugify(z.nombre);
    const [zona] = await models.Zona.findOrCreate({
      where: { slug },
      defaults: {
        nombre: z.nombre,
        parroquia: z.parroquia,
        descripcion: z.descripcion,
        latitud: z.lat,
        longitud: z.lng,
        orden: z.orden,
      },
    });
    zonaPorSlug[slug] = zona;
  }
  log(`${ZONAS.length} zonas`);

  // ---------- Amenidades ----------
  const amenidadPorSlug = {};
  for (const [slug, nombre, icono, categoria] of AMENIDADES) {
    const [a] = await models.Amenidad.findOrCreate({ where: { slug }, defaults: { nombre, icono, categoria } });
    amenidadPorSlug[slug] = a;
  }
  log(`${AMENIDADES.length} amenidades`);

  // ---------- Super admin ----------
  const emailAdmin = (process.env.SEED_ADMIN_EMAIL || 'admin@salinasbooking.local').toLowerCase();
  if (!(await models.User.findOne({ where: { email: emailAdmin } }))) {
    const password = process.env.SEED_ADMIN_PASSWORD || passwordAleatoria();
    await models.User.create({ nombre: 'Administrador', apellido: 'Plataforma', email: emailAdmin, password, rol: 'super_admin' });
    credenciales.push({ rol: 'super_admin', email: emailAdmin, password });
  }

  // ---------- Hoteles ----------
  const lista = HOTELES.filter((h) => h.real || demo);
  for (const h of lista) {
    const slug = slugify(h.nombre);
    if (await models.Hotel.findOne({ where: { slug }, attributes: ['id'] })) {
      log(`hotel existente, se omite: ${h.nombre}`);
      continue;
    }

    const hotel = await models.Hotel.create({
      nombre: h.nombre,
      slug,
      zona_id: zonaPorSlug[h.zona]?.id,
      tipo_alojamiento: h.tipo_alojamiento,
      estrellas: h.estrellas,
      destacado: Boolean(h.destacado),
      descripcion: h.descripcion,
      direccion: h.direccion,
      ciudad: 'Salinas',
      telefono: h.telefono || null,
      latitud: zonaPorSlug[h.zona]?.latitud,
      longitud: zonaPorSlug[h.zona]?.longitud,
      politica_cancelacion: h.politica_cancelacion,
      imagen_principal: h.imagenes?.[0] || null,
      estado: 'activo',
    });

    await models.HotelAmenidad.bulkCreate(
      h.amenidades.filter((s) => amenidadPorSlug[s]).map((s) => ({ hotel_id: hotel.id, amenidad_id: amenidadPorSlug[s].id }))
    );

    if (h.imagenes?.length) {
      await models.Imagen.bulkCreate(
        h.imagenes.map((url, i) => ({ hotel_id: hotel.id, url, alt: `${h.nombre} - foto ${i + 1}`, orden: i }))
      );
    }

    // Temporadas (año en curso y siguiente): base todo el año + costa (dic-abr) + ballenas (jun-sep).
    const y = new Date().getUTCFullYear();
    const temporadas = {};
    for (const anio of [y, y + 1]) {
      const defs = [
        [`Temporada baja ${anio}`, `${anio}-01-01`, `${anio}-12-31`, 'baja'],
        [`Alta temporada de playa ${anio}`, `${anio}-01-01`, `${anio}-04-30`, 'alta'],
        [`Avistamiento de ballenas ${anio}`, `${anio}-06-15`, `${anio}-09-30`, 'media'],
        [`Alta temporada de playa ${anio} (fin de año)`, `${anio}-12-15`, `${anio}-12-31`, 'alta'],
      ];
      for (const [nombre, ini, fin, tipo] of defs) {
        temporadas[nombre] = await models.Temporada.create({ hotel_id: hotel.id, nombre, fecha_inicio: ini, fecha_fin: fin, tipo });
      }
    }
    const factor = { baja: 1, media: 1.2, alta: 1.5 };

    let numero = 100;
    for (const t of h.tipos) {
      const tipo = await models.TipoHabitacion.create({
        hotel_id: hotel.id,
        nombre: t.nombre,
        descripcion: `${t.nombre} para hasta ${t.capacidad} persona(s).`,
        capacidad_maxima: t.capacidad,
        camas_sencillas: t.sencillas,
        camas_dobles: t.dobles,
        tiene_vista: Boolean(t.vista),
        tiene_balcon: Boolean(t.balcon),
        precio_base: t.base,
      });

      for (const t2 of Object.values(temporadas)) {
        for (const dia of ['entre_semana', 'fin_semana']) {
          await models.TarifaHabitacion.create({
            hotel_id: hotel.id,
            tipo_habitacion_id: tipo.id,
            temporada_id: t2.id,
            tipo_dia: dia,
            precio: Math.round(t.base * factor[t2.tipo] * (dia === 'fin_semana' ? 1.2 : 1)),
          });
        }
      }

      for (let i = 0; i < t.n; i += 1) {
        numero += 1;
        await models.Habitacion.create({
          hotel_id: hotel.id,
          tipo_habitacion_id: tipo.id,
          numero_habitacion: String(numero),
          piso: Math.floor(numero / 100) - 1,
        });
      }
      numero = Math.ceil(numero / 100) * 100; // el siguiente tipo arranca en otra centena
    }

    await models.Servicio.bulkCreate([
      { hotel_id: hotel.id, nombre: 'Desayuno continental', descripcion: 'Por persona', precio: 6, tipo: 'reserva' },
      { hotel_id: hotel.id, nombre: 'Traslado desde terminal', descripcion: 'Trayecto único', precio: 10, tipo: 'reserva' },
    ]);

    // Administrador del hotel.
    const emailHotel = `admin.${slug}@salinasbooking.local`;
    const password = process.env.SEED_DEMO_PASSWORD || passwordAleatoria();
    await models.User.create({
      hotel_id: hotel.id, nombre: 'Administrador', apellido: h.nombre, email: emailHotel, password, rol: 'admin',
    });
    credenciales.push({ rol: `admin (${h.nombre})`, email: emailHotel, password });

    // Reseñas de muestra solo para hoteles ficticios.
    if (demo && !h.real) {
      const cuantas = 3 + (hotel.id % 3);
      for (let i = 0; i < cuantas; i += 1) {
        const [puntuacion, titulo, comentario] = RESENAS_DEMO[(hotel.id + i) % RESENAS_DEMO.length];
        await models.Valoracion.create({ hotel_id: hotel.id, puntuacion, titulo, comentario });
      }
      await recalcularRating(hotel.id);
    }

    log(`hotel creado: ${h.nombre}`);
  }

  return credenciales;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  sembrar({ demo: args.includes('--demo'), reset: args.includes('--reset') })
    .then((credenciales) => {
      if (credenciales.length) {
        console.log('\n=== CREDENCIALES (guárdalas, no se vuelven a mostrar) ===');
        for (const c of credenciales) console.log(`${c.rol.padEnd(45)} ${c.email}  /  ${c.password}`);
      }
    })
    .catch((e) => {
      console.error('[seed] ERROR:', e);
      process.exitCode = 1;
    })
    .finally(closeConnection);
}

module.exports = { sembrar };
