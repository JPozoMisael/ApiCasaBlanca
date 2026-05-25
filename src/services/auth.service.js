const { models } = require('../models');
const { generarToken } = require('../utils/tokens');

// =========================================
// LOGIN
// =========================================

async function login({ email, password }) {

  console.log('=========================================');
  console.log('🔐 [LOGIN] Iniciando proceso de login');
  console.log(`📧 [LOGIN] Email recibido: ${email}`);
  console.log(`🔑 [LOGIN] Password recibida: ${password ? '***' : 'VACÍA'}`);

  // =====================================
  // VALIDAR DATOS
  // =====================================

  if (!email || !password) {
    console.log('❌ [LOGIN] Error: Email o password vacíos');
    const err = new Error('Email y password son requeridos');
    err.statusCode = 400;
    throw err;
  }

  // =====================================
  // NORMALIZAR EMAIL
  // =====================================

  const emailNorm = String(email).trim().toLowerCase();
  console.log(`📧 [LOGIN] Email normalizado: ${emailNorm}`);

  // =====================================
  // BUSCAR USUARIO
  // =====================================

  console.log('🔍 [LOGIN] Buscando usuario en la base de datos...');
  const user = await models.User
    .scope('withPassword')
    .findOne({
      where: { email: emailNorm },
    });

  if (!user) {
    console.log('❌ [LOGIN] Usuario NO encontrado en la BD');
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  console.log(`✅ [LOGIN] Usuario encontrado:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Rol: ${user.rol}`);
  console.log(`   - Estado: ${user.estado}`);
  console.log(`   - Password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NO HAY PASSWORD'}`);

  // =====================================
  // VALIDAR ESTADO
  // =====================================

  if (user.estado !== 'activo') {
    console.log(`❌ [LOGIN] Usuario inactivo. Estado: ${user.estado}`);
    const err = new Error('Usuario inactivo');
    err.statusCode = 403;
    throw err;
  }

  // =====================================
  // VALIDAR PASSWORD
  // =====================================

  console.log('🔑 [LOGIN] Comparando contraseña...');
  const valido = await user.comparePassword(password);
  console.log(`🔑 [LOGIN] Resultado comparación: ${valido ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);

  if (!valido) {
    console.log('❌ [LOGIN] Contraseña incorrecta');
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  // =====================================
  // ACTUALIZAR ÚLTIMO LOGIN
  // =====================================

  console.log('📝 [LOGIN] Actualizando último login...');
  await user.update({ ultimo_login: new Date() });

  // =====================================
  // GENERAR TOKEN
  // =====================================

  console.log('🎫 [LOGIN] Generando token JWT...');
  const token = generarToken(
    { id: user.id, rol: user.rol },
    process.env.JWT_EXPIRE || '8h'
  );

  // =====================================
  // RETORNAR USUARIO SEGURO
  // =====================================

  console.log('👤 [LOGIN] Obteniendo usuario seguro (sin password)...');
  const usuarioSeguro = await models.User.findByPk(user.id);

  console.log('✅ [LOGIN] LOGIN EXITOSO');
  console.log('=========================================');

  return {
    token,
    usuario: usuarioSeguro
  };
}

// =========================================
// REGISTER
// =========================================

async function register(data) {
  console.log('=========================================');
  console.log('📝 [REGISTER] Iniciando registro de usuario');
  console.log(`📧 [REGISTER] Email: ${data.email}`);
  console.log(`👤 [REGISTER] Nombre: ${data.nombre} ${data.apellido}`);

  const { hotel_id, nombre, apellido, email, password } = data;

  // =====================================
  // VALIDAR DATOS
  // =====================================

  if (!nombre || !apellido || !email || !password) {
    console.log('❌ [REGISTER] Datos incompletos');
    const err = new Error('Datos incompletos');
    err.statusCode = 400;
    throw err;
  }

  // =====================================
  // NORMALIZAR EMAIL
  // =====================================

  const emailNorm = String(email).trim().toLowerCase();
  console.log(`📧 [REGISTER] Email normalizado: ${emailNorm}`);

  // =====================================
  // VALIDAR EMAIL EXISTENTE
  // =====================================

  const existe = await models.User.findOne({
    where: { email: emailNorm }
  });

  if (existe) {
    console.log(`❌ [REGISTER] El usuario ya existe: ${emailNorm}`);
    const err = new Error('El usuario ya existe');
    err.statusCode = 409;
    throw err;
  }

  // =====================================
  // REGISTER PÚBLICO - SIEMPRE CLIENTE
  // =====================================

  const rolFinal = 'cliente';
  console.log(`👤 [REGISTER] Rol asignado: ${rolFinal}`);

  // =====================================
  // CREAR USUARIO
  // =====================================

  console.log('💾 [REGISTER] Creando usuario en la base de datos...');
  const nuevoUsuario = await models.User.create({
    hotel_id: hotel_id || null,
    nombre,
    apellido,
    email: emailNorm,
    password,
    rol: rolFinal,
    estado: 'activo'
  });

  console.log(`✅ [REGISTER] Usuario creado exitosamente. ID: ${nuevoUsuario.id}`);
  console.log('=========================================');

  return nuevoUsuario;
}

module.exports = {
  login,
  register
};