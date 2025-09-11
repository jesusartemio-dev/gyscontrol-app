// ===================================================
// 📁 Archivo: debug-session.js
// 🔧 Descripción: Script para debuggear problemas de sesión y usuario
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function debugSession() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...')
    
    // Verificar usuarios existentes
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    console.log(`📊 Total de usuarios: ${users.length}`)
    
    if (users.length === 0) {
      console.log('⚠️ No hay usuarios en la base de datos. Creando usuario admin...')
      
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@gys.com',
          name: 'Admin GYS',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      
      console.log('✅ Usuario admin creado:', {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      })
    } else {
      console.log('👥 Usuarios existentes:')
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`)
      })
    }
    
    // Verificar proyectos
    console.log('\n🏗️ Verificando proyectos...')
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        comercialId: true,
        gestorId: true
      },
      take: 5
    })
    
    console.log(`📊 Total de proyectos (primeros 5): ${proyectos.length}`)
    proyectos.forEach(proyecto => {
      console.log(`  - ${proyecto.codigo}: ${proyecto.nombre}`)
      console.log(`    Comercial ID: ${proyecto.comercialId}`)
      console.log(`    Gestor ID: ${proyecto.gestorId}`)
    })
    
    // Verificar listas de equipos
    console.log('\n📋 Verificando listas de equipos...')
    const listas = await prisma.listaEquipo.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        responsableId: true,
        proyectoId: true
      },
      take: 5
    })
    
    console.log(`📊 Total de listas (primeras 5): ${listas.length}`)
    listas.forEach(lista => {
      console.log(`  - ${lista.codigo}: ${lista.nombre}`)
      console.log(`    Responsable ID: ${lista.responsableId}`)
      console.log(`    Proyecto ID: ${lista.proyectoId}`)
    })
    
  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
debugSession()
  .then(() => {
    console.log('\n✅ Verificación completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error)
    process.exit(1)
  })