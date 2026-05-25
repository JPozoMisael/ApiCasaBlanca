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
  console.log(`🔑 [LOGIN] Longitud password: ${password ? password.length : 0}`);

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
  console.log('🔍 [LOGIN] Usando scope: withPassword');
  
  const user = await models.User
    .scope('withPassword')
    .findOne({
      where: { email: emailNorm },
    });

  if (!user) {
    console.log('❌ [LOGIN] Usuario NO encontrado en la BD');
    console.log(`❌ [LOGIN] Email buscado: ${emailNorm}`);
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  console.log(`✅ [LOGIN] Usuario encontrado:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Rol: ${user.rol}`);
  console.log(`   - Estado: ${user.estado}`);
  console.log(`   - Nombre: ${user.nombre} ${user.apellido}`);
  console.log(`   - Password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NO HAY PASSWORD'}`);
  console.log(`   - Longitud hash: ${user.password ? user.password.length : 0}`);

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

  console.log('🔑 [LOGIN] Iniciando comparación de contraseña...');
  console.log(`🔑 [LOGIN] Password ingresada (longitud): ${password.length}`);
  console.log(`🔑 [LOGIN] Hash almacenado (longitud): ${user.password.length}`);
  
  try {
    const valido = await user.comparePassword(password);
    console.log(`🔑 [LOGIN] Resultado de comparePassword: ${valido}`);
    console.log(`🔑 [LOGIN] Tipo de resultado: ${typeof valido}`);
    
    if (!valido) {
      console.log('❌ [LOGIN] Contraseña incorrecta - comparePassword devolvió false');
      const err = new Error('Credenciales inválidas');
      err.statusCode = 401;
      throw err;
    }
  } catch (error) {
    console.log(`❌ [LOGIN] Error en comparePassword: ${error.message}`);
    throw error;
  }

  console.log('✅ [LOGIN] Contraseña válida');

  // =====================================
  // ACTUALIZAR ÚLTIMO LOGIN
  // =====================================

  console.log('📝 [LOGIN] Actualizando último login...');
  await user.update({ ultimo_login: new Date() });
  console.log('✅ [LOGIN] Último login actualizado');

  // =====================================
  // GENERAR TOKEN
  // =====================================

  console.log('🎫 [LOGIN] Generando token JWT...');
  const token = generarToken(
    { id: user.id, rol: user.rol },
    process.env.JWT_EXPIRE || '8h'
  );
  console.log(`✅ [LOGIN] Token generado (primeros 50 chars): ${token ? token.substring(0, 50) + '...' : 'NO TOKEN'}`);

  // =====================================
  // RETORNAR USUARIO SEGURO
  // =====================================

  console.log('👤 [LOGIN] Obteniendo usuario seguro (sin password)...');
  const usuarioSeguro = await models.User.findByPk(user.id);
  console.log(`✅ [LOGIN] Usuario seguro obtenido: ${usuarioSeguro ? 'OK' : 'NULL'}`);

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
  console.log(`🔑 [REGISTER] Password recibida: ${data.password ? '***' : 'VACÍA'}`);

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

  console.log('🔍 [REGISTER] Verificando si el email ya existe...');
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
  console.log(`   - hotel_id: ${hotel_id || null}`);
  console.log(`   - nombre: ${nombre}`);
  console.log(`   - apellido: ${apellido}`);
  console.log(`   - email: ${emailNorm}`);
  console.log(`   - rol: ${rolFinal}`);
  console.log(`   - estado: activo`);
  
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