// Entorno de tests: SQLite en memoria, sin límites de tasa. Debe cargarse antes que la app.
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.JWT_SECRET = 'test-secret';
process.env.MAX_RESERVAS_ACTIVAS_WEB = '1000';
process.env.SEED_ADMIN_PASSWORD = 'SuperAdmin123!';
process.env.SEED_DEMO_PASSWORD = 'Demo12345!';

const app = require('../src/app');
const { sembrar } = require('../scripts/seed');
const { sequelize } = require('../src/config/db');

async function arrancar() {
  await sembrar({ demo: true, reset: true });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  async function request(method, path, { body, token } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  }

  async function login(email, password) {
    const r = await request('POST', '/auth/login', { body: { email, password } });
    if (r.status !== 200) throw new Error(`login falló para ${email}: ${JSON.stringify(r.body)}`);
    return r.body.data.token;
  }

  async function cerrar() {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  }

  return { request, login, cerrar, base };
}

// Devuelve la fecha ISO del próximo día de la semana dado (0=dom … 6=sáb) posterior a `desde`.
function proximoDia(diaSemana, desde) {
  const d = new Date(`${desde}T00:00:00Z`);
  while (d.getUTCDay() !== diaSemana) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function sumar(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

module.exports = { arrancar, proximoDia, sumar };
