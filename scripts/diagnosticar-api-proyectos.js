/**
 * 🔍 Script de diagnóstico completo de la API de proyectos
 * 
 * Investiga paso a paso por qué la API devuelve array vacío
 * para usuarios admin autenticados
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosticarAPIProyectos() {
  console.log('🔍 DIAGNÓSTICO COMPLETO - API PROYECTOS USUARIO');
  console.log('='.repeat(60));
  
  try {
    // 1. VERIFICAR USUARIO PROBLEMÁTICO
    console.log('\n1️⃣ VERIFICANDO USUARIO jesus.m@gyscontrol.com');
    console.log('-'.repeat(50));
    
    const usuario = await prisma.user.findUnique({
      where: { email: 'jesus.m@gyscontrol.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    if (!usuario) {
      console.log('❌ CRÍTICO: Usuario NO existe en BD');
      return;
    }
    
    console.log('👤 Usuario encontrado:');
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nombre: ${usuario.name}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Rol: ${usuario.role}`);
    
    // 2. VERIFICAR TODOS LOS PROYECTOS
    console.log('\n2️⃣ VERIFICANDO PROYECTOS EN BD');
    console.log('-'.repeat(50));
    
    const todosProyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        comercialId: true,
        gestorId: true
      }
    });
    
    console.log(`📊 Total proyectos en BD: ${todosProyectos.length}`);
    todosProyectos.forEach((proj, i) => {
      console.log(`   ${i+1}. ${proj.codigo} - ${proj.nombre} (${proj.estado})`);
      console.log(`      Comercial: ${proj.comercialId} | Gestor: ${proj.gestorId}`);
    });
    
    // 3. SIMULAR CONSULTA EXACTA DE LA API
    console.log('\n3️⃣ SIMULANDO CONSULTA EXACTA DE LA API');
    console.log('-'.repeat(50));
    
    const rolesConAccesoTotal = ['admin', 'gerente'];
    let where = {};
    const hasAccesoTotal = rolesConAccesoTotal.includes(usuario.role);
    
    console.log(`🎯 Usuario tiene acceso total: ${hasAccesoTotal}`);
    console.log(`📋 Filtro WHERE aplicado:`, JSON.stringify(where, null, 2));
    
    // Consulta exacta de la API
    const proyectosConsulta = await prisma.proyecto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        comercial: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        gestor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    
    console.log(`✅ Proyectos encontrados en consulta exacta: ${proyectosConsulta.length}`);
    
    if (proyectosConsulta.length > 0) {
      console.log('\n📋 PROYECTOS ENCONTRADOS:');
      proyectosConsulta.forEach((proyecto, i) => {
        console.log(`   ${i+1}. ${proyecto.codigo} - ${proyecto.nombre}`);
        console.log(`      Estado: ${proyecto.estado}`);
        console.log(`      Responsable: ${proyecto.gestor?.name || proyecto.comercial?.name || 'Sin responsable'}`);
      });
    } else {
      console.log('❌ PROBLEMA: Consulta exacta devuelve 0 proyectos');
      
      // Debug adicional: verificar si hay proyectos en absoluto
      const countTotal = await prisma.proyecto.count();
      console.log(`   🔍 Proyectos totales en BD: ${countTotal}`);
      
      if (countTotal > 0) {
        console.log('   ❌ CRÍTICO: Hay proyectos en BD pero la consulta los filtró todos');
        
        // Verificar si es problema de relaciones
        console.log('\n🔍 DEBUG: Verificando relaciones...');
        const proyectosConRelaciones = await prisma.proyecto.findMany({
          take: 2,
          include: {
            comercial: { select: { id: true, name: true } },
            gestor: { select: { id: true, name: true } }
          }
        });
        
        console.log(`   Proyectos con relaciones: ${proyectosConRelaciones.length}`);
        proyectosConRelaciones.forEach((proj, i) => {
          console.log(`   ${i+1}. ${proj.nombre}`);
          console.log(`      Comercial: ${proj.comercial ? proj.comercial.name : 'NULL'}`);
          console.log(`      Gestor: ${proj.gestor ? proj.gestor.name : 'NULL'}`);
        });
      }
    }
    
    // 4. VERIFICAR OTROS USUARIOS
    console.log('\n4️⃣ VERIFICANDO OTROS USUARIOS ADMIN');
    console.log('-'.repeat(50));
    
    const todosUsuarios = await prisma.user.findMany({
      where: { role: { in: ['admin', 'gerente'] } },
      select: { id: true, name: true, email: true, role: true }
    });
    
    console.log(`👥 Usuarios con acceso total: ${todosUsuarios.length}`);
    todosUsuarios.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // 5. PROBAR CON OTRO USUARIO ADMIN
    if (todosUsuarios.length > 1) {
      const otroAdmin = todosUsuarios.find(u => u.id !== usuario.id);
      if (otroAdmin) {
        console.log(`\n5️⃣ PROBANDO CON OTRO ADMIN: ${otroAdmin.name}`);
        console.log('-'.repeat(50));
        
        const proyectosOtroAdmin = await prisma.proyecto.findMany({
          where: {},
          select: { id: true, nombre: true, codigo: true }
        });
        
        console.log(`✅ Proyectos para ${otroAdmin.name}: ${proyectosOtroAdmin.length}`);
        if (proyectosOtroAdmin.length > 0) {
          console.log('   ❌ PROBLEMA ESPECÍFICO DEL USUARIO jesus.m@gyscontrol.com');
        }
      }
    }
    
    // 6. CONCLUSIÓN Y RECOMENDACIONES
    console.log('\n6️⃣ CONCLUSIÓN Y DIAGNÓSTICO');
    console.log('='.repeat(60));
    
    if (proyectosConsulta.length === 0) {
      console.log('❌ PROBLEMA CONFIRMADO: API devuelve 0 proyectos para admin');
      console.log('\n🎯 POSIBLES CAUSAS:');
      console.log('1. Error en validación de sesión en la API real');
      console.log('2. Problema con el middleware de autenticación');
      console.log('3. Error silencioso en la consulta Prisma');
      console.log('4. Problema de configuración de base de datos');
      console.log('\n🔧 RECOMENDACIONES:');
      console.log('1. Agregar logs detallados a la API');
      console.log('2. Verificar configuración de NextAuth');
      console.log('3. Probar la API directamente en el navegador');
      console.log('4. Verificar que la sesión contiene el rol correcto');
    } else {
      console.log('✅ API debería funcionar correctamente');
      console.log('🎯 PROBLEMA PROBABLE: Sesión o autenticación en el navegador');
    }
    
  } catch (error) {
    console.error('❌ ERROR EN DIAGNÓSTICO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar diagnóstico
diagnosticarAPIProyectos();