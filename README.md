# API Salinas Booking

Marketplace de reservas de alojamiento del cantón Salinas (Ecuador). Node.js + Express + Sequelize (MySQL).
Cada hotel tiene su propio equipo; la plataforma (`super_admin`) los registra y los aprueba.

## Puesta en marcha

```bash
cp .env.example .env           # completa credenciales de MySQL y JWT_SECRET
npm install
npm run db:migrate             # crea/actualiza el esquema (aditivo, no borra datos)
npm run db:seed:demo           # zonas, amenidades, super_admin y hoteles de muestra (imprime las credenciales)
npm run dev
```

- `npm run db:seed` siembra solo catálogos, el super_admin y las propiedades reales del proyecto.
- `npm run db:reset:demo` **borra todo** y recrea (bloqueado en producción).
- `npm test` corre la suite de integración sobre SQLite en memoria (no requiere MySQL).

> Migrar la base del sistema de un solo hotel: haz un respaldo y ejecuta `npm run db:migrate`.
> Agrega columnas/tablas/índices que faltan y rellena `hoteles.slug`; no elimina nada.
> Los tipos de habitación existentes quedan con `precio_base = 0`: siguen usando sus tarifas por temporada.

## Roles, permisos y menú (en la base de datos)

Los roles, los permisos y las opciones del menú lateral viven en las tablas `roles`, `permisos`, `rol_permisos` y `menu_items`.
El servidor **exige el permiso en cada petición** (`permiso('reservas.gestionar')`), no solo oculta el menú, y el usuario se
relee de la BD en cada llamada: desactivar una cuenta o cambiar sus permisos surte efecto en segundos.

| Rol (de fábrica) | Alcance | Puede |
|---|---|---|
| `super_admin` | plataforma | Todo: todos los alojamientos, roles, permisos y menú |
| `admin` | hotel | Todo lo de su alojamiento (ficha, precios, personal, reportes…) |
| `recepcion` | hotel | Reservas, check-in/out, cobros, huéspedes, estado de habitaciones |
| `limpieza` | hotel | Ver habitaciones y cambiar su estado |
| `contabilidad` | hotel | Ver reservas, cobros y reportes (solo lectura) |
| `cliente` | cliente | Sus reservas, opiniones y favoritos (sin panel) |

- **Alcance**: `plataforma` ve todos los hoteles; `hotel` queda atado a su hotel; `cliente` no tiene panel.
- Un rol de hotel **nunca** puede recibir permisos `plataforma.*`; un rol desconocido falla cerrado (sin acceso).
- Los administradores de hotel solo asignan roles marcados "asignable por el hotel".
- Desde el panel (**Roles y permisos**, solo plataforma) se crean roles, se marcan permisos y se ordena/oculta el menú, sin tocar código.
- `npm run db:migrate` y `npm run db:seed` siembran los datos de fábrica. Solo **agregan** lo que falta; no pisan lo que personalizaste.
- **MariaDB directo**: `npm run db:sql` genera `database/rbac_mariadb.sql` (tablas, roles, permisos y menú) para ejecutarlo con el cliente `mariadb`.

El aislamiento entre hoteles lo aplica `middleware/tenant.middleware.js`; `super_admin` opera un hotel con `?hotel_id=`, `hotel_id` en el body o el header `X-Hotel-Id`.

## Canal SiteMinder / Little Hotelier (esta plataforma como un canal de venta)

Para hoteles que ya administran sus habitaciones y tarifas en Little Hotelier (SiteMinder), la plataforma se conecta como **un canal más**,
siguiendo la [API SiteConnect](https://developer.siteminder.com/siteconnect-api/siteconnect-api.md) (SOAP 1.1 + OpenTravel, WS-Security):

| Sentido | Mensaje | Qué hace aquí |
|---|---|---|
| SiteMinder → plataforma | `OTA_HotelAvailRQ` | Devuelve habitaciones y tarifa del hotel (Rooms and Rates) |
| SiteMinder → plataforma | `OTA_HotelAvailNotifRQ` | Cupo por fecha, stop sell, llegada/salida cerrada, estancia mínima/máxima |
| SiteMinder → plataforma | `OTA_HotelRateAmountNotifRQ` | Tarifa por noche (en USD; con o sin impuestos) |
| plataforma → SiteMinder | `OTA_HotelResNotifRQ` | Commit / Cancel de las reservas hechas en la web, con cola y reintentos |

- **Endpoint global** (uno para todos los hoteles): `POST /api/v1/channels/siteminder`. Autenticación WS-Security con `SITEMINDER_USER` / `SITEMINDER_PASSWORD`. Los errores viajan dentro del mensaje OTA (4/448 credenciales, 6/392 hotel desconocido, 12/402 habitación, 12/249 tarifa).
- **Alta de un hotel**: en el panel, *Canales de venta* → *Conectar*. Genera el `HotelCode` (p. ej. `SB00012`) que se entrega a SiteMinder y un código por tipo de habitación (editable). La conexión pasa a *activa* con el primer envío correcto.
- **Fuente de verdad**: en los tipos de habitación mapeados, cupo, tarifas y restricciones los manda SiteMinder; sin datos para una noche no se vende. Además se respeta el inventario propio (nunca se vende más de lo que el hotel tiene registrado aquí). Los tipos sin mapear siguen con el inventario propio.
- **Sin sobreventa entre envíos**: cada venta local descuenta cupo hasta que SiteMinder confirma la nueva disponibilidad.
- **Envío de reservas**: se encolan en `canal_salidas`; se reintenta ante caídas o 5xx con esperas crecientes (8 intentos); si SiteMinder responde `<Errors>` **no** se reintenta y queda para revisión (reintento manual desde el panel). Cancelar antes de que el Commit salga no envía nada.
- **Pausar** la conexión detiene la venta de los tipos mapeados. Cada mensaje queda en la bitácora (`canal_mensajes`).
- Pruebas: `tests/canales.test.js` (SiteMinder simulado en ambos sentidos).

> **Estado de certificación:** implementado según la documentación pública, probado solo contra simuladores. Para operar con hoteles reales
> se requiere el acuerdo de socio con SiteMinder, el entorno de pruebas y pasar su certificación (Rooms and Rates, disponibilidad, stop sell, tarifas, reservas).
> Variables en `.env.example`. Supuestos a validar en certificación: tarifa por noche en cada `Rate`, código de impuesto 35, reparto de huéspedes por habitación.

## Endpoints principales (`/api/v1`)

**Público**
`GET /zonas` · `GET /amenidades` · `GET /search/hoteles` (zona, fechas, huéspedes, filtros, orden, paginación, facets) ·
`GET /hotels/featured` · `GET /hotels/:slug` · `GET /hotels/:slug/availability` · `GET /hotels/:slug/reviews`

**Reservas**
`POST /bookings/quote` · `POST /bookings` (invitado o autenticado) · `POST /bookings/lookup` (código + email) ·
`GET /bookings` · `GET /bookings/:id` · `PATCH /bookings/:id/cancelar` ·
personal: `PATCH /bookings/:id/{confirmar,checkin,checkout,no-show}`

**Cuenta**
`GET /auth/menu` (menú y permisos del usuario) · `POST /auth/register` · `POST /auth/login` · `GET|PATCH /auth/me` · `POST /auth/change-password` ·
`POST /reviews` · `GET /favorites` · `PUT|DELETE /favorites/:hotelId`

**Gestión del hotel** (admin/recepción)
`/calendar` (ocupación por habitación y día) · `/manage/hotel` · `/room-types` · `/rooms` · `/tarifas` · `/temporadas` · `/services` · `/images` · `/bloqueos` ·
`/clients` · `/payments` · `/frontdesk/today` · `/reports/{dashboard,ocupacion,ingresos}` · `/admin/usuarios`

**Plataforma** (super_admin)
`/platform/stats` · `/platform/hotels` (alta con administrador, aprobación) · `/platform/zonas` · `/platform/reviews/:id` · `/platform/roles`, `/platform/permisos`, `/platform/menu`

## Reglas de negocio

- **Se reserva por tipo de habitación**; el sistema asigna las unidades libres. Solo el personal puede fijar una habitación concreta.
- **Disponibilidad** (`services/disponibilidad.service.js`): la noche de salida no se ocupa; reservas `pendiente` con la
  retención vencida no bloquean; bloqueos y habitaciones inactivas/en mantenimiento salen del inventario.
- **Anti-sobreventa**: la creación de reservas bloquea la fila del hotel (`SELECT … FOR UPDATE`) dentro de la transacción.
- **Precios**: tarifa (tipo × temporada × entre semana / fin de semana — noches vie y sáb) → `precio_base` del tipo.
  Impuesto `IVA_PORCENTAJE` (15 %). La comisión de la plataforma se guarda por reserva.
- **Pago**: por ahora "pago en el hotel" (reserva confirmada al instante) o pendiente con retención `RETENCION_MINUTOS`;
  el personal registra los pagos (`POST /payments`). Falta integrar una pasarela (Stripe ya está como dependencia).
- **Cancelación**: política por hotel (`flexible` / `moderada` / `estricta`) evaluada al cancelar y mostrada al reservar.
- **Reseñas** solo de estadías completadas (`check_out`), una por reserva; actualizan el rating del hotel.
