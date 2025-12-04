/**
 * 🔧 Script para crear usuario de prueba para el sistema de horas-hombre
 * 
 * Crea:
 * - Usuario: horas.test@gys.com
 * - Contraseña: horastest123
 * - Rol: admin
 * - Asignado como gestor a proyectos existentes
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function crearUsuarioTest() {
  console.log('🔧 CREANDO USUARIO DE PRUEBA PARA HORAS-HOMBRE');
  console.log('='.repeat(60));
  
  try {
    // 1. CREAR USUARIO DE PRUEBA
    console.log('\n1️⃣ CREANDO USUARIO DE PRUEBA');
    console.log('-'.repeat(50));
    
    const email = 'horas.test@gys.com';
    const password = 'horastest123';
    const nombre = 'Usuario Test Horas-Hombre';
    
    // Verificar si el usuario ya existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { email }
    });
    
    if (usuarioExistente) {
      console.log(`⚠️  Usuario ${email} ya existe`);
      console.log(`   ID: ${usuarioExistente.id}`);
      console.log(`   Rol: ${usuarioExistente.role}`);
      console.log(`   Actualizando a admin...`);
      
      // Actualizar a admin si no lo es
      const usuarioActualizado = await prisma.user.update({
        where: { id: usuarioExistente.id },
        data: { 
          role: 'admin',
          name: nombre
        }
      });
      
      console.log(`✅ Usuario actualizado a admin exitosamente`);
      console.log(`   ID: ${usuarioActualizado.id}`);
      console.log(`   Email: ${usuarioActualizado.email}`);
      console.log(`   Rol: ${usuarioActualizado.role}`);
      
    } else {
      // Crear nuevo usuario
      const passwordHash = await bcrypt.hash(password, 12);
      
      const nuevoUsuario = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name: nombre,
          role: 'admin'
        }
      });
      
      console.log(`✅ Usuario creado exitosamente`);
      console.log(`   ID: ${nuevoUsuario.id}`);
      console.log(`   Email: ${nuevoUsuario.email}`);
      console.log(`   Rol: ${nuevoUsuario.role}`);
    }
    
    // 2. OBTENER USUARIO FINAL
    const usuario = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!usuario) {
      throw new Error('No se pudo crear/obtener el usuario');
    }
    
    // 3. OBTENER PROYECTOS EXISTENTES
    console.log('\n2️⃣ VERIFICANDO PROYECTOS EXISTENTES');
    console.log('-'.repeat(50));
    
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        comercialId: true,
        gestorId: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`📋 Proyectos encontrados: ${proyectos.length}`);
    proyectos.forEach((proj, i) => {
      console.log(`   ${i+1}. ${proj.codigo} - ${proj.nombre}`);
      console.log(`      Gestor actual: ${proj.gestorId}`);
    });
    
    // 4. ASIGNAR USUARIO COMO GESTOR A ALGUNOS PROYECTOS
    console.log('\n3️⃣ ASIGNANDO USUARIO COMO GESTOR A PROYECTOS');
    console.log('-'.repeat(50));
    
    // Asignar como gestor al primer proyecto (para tener acceso)
    if (proyectos.length > 0) {
      const proyectoAAsignar = proyectos[0]; // Primer proyecto
      
      console.log(`🎯 Asignando usuario como gestor de: ${proyectoAAsignar.codigo}`);
      
      const proyectoActualizado = await prisma.proyecto.update({
        where: { id: proyectoAAsignar.id },
        data: { gestorId: usuario.id }
      });
      
      console.log(`✅ Usuario asignado como gestor exitosamente`);
      console.log(`   Proyecto: ${proyectoActualizado.codigo}`);
      console.log(`   Nuevo gestor ID: ${proyectoActualizado.gestorId}`);
    }
    
    // 5. VERIFICAR ACCESO DEL USUARIO
    console.log('\n4️⃣ VERIFICANDO ACCESO DEL USUARIO');
    console.log('-'.repeat(50));
    
    const proyectosDelUsuario = await prisma.proyecto.findMany({
      where: {
        OR: [
          { gestorId: usuario.id },
          { comercialId: usuario.id }
        ]
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true
      }
    });
    
    console.log(`✅ Proyectos accesibles por el usuario: ${proyectosDelUsuario.length}`);
    proyectosDelUsuario.forEach((proj, i) => {
      console.log(`   ${i+1}. ${proj.codigo} - ${proj.nombre} (${proj.estado})`);
    });
    
    // 6. RESUMEN FINAL
    console.log('\n5️⃣ RESUMEN DE CONFIGURACIÓN');
    console.log('='.repeat(60));
    
    console.log(`👤 USUARIO DE PRUEBA CONFIGURADO:`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Rol: ${usuario.role}`);
    console.log(`   Proyectos accesibles: ${proyectosDelUsuario.length}`);
    
    console.log(`\n🎯 CREDENCIALES PARA PROBAR:`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Rol: admin (acceso total a proyectos)`);
    
    console.log(`\n🔗 URL DE PRUEBA:`);
    console.log(`   Login: http://localhost:3000/login`);
    console.log(`   Horas-Hombre: http://localhost:3000/horas-hombre/registro`);
    
    console.log(`\n✅ CONFIGURACIÓN COMPLETADA`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ ERROR AL CREAR USUARIO DE PRUEBA:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
crearUsuarioTest();