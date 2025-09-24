// ===================================================
// 📁 Archivo: create-admin-user.js
// 📌 Ubicación: root/
// 🔧 Descripción: Script para crear usuario administrador
//
// 🧠 Uso: Crear usuario admin para pruebas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔐 Creando usuario administrador...')
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // Crear o actualizar usuario admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@gys.com' },
      update: {
        password: hashedPassword,
        role: 'admin',
        name: 'Administrador GYS'
      },
      create: {
        email: 'admin@gys.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Administrador GYS',
        emailVerified: new Date()
      }
    })
    
    console.log('✅ Usuario administrador creado exitosamente:')
    console.log('📧 Email: admin@gys.com')
    console.log('🔑 Password: admin123')
    console.log('👤 Role:', adminUser.role)
    console.log('🆔 ID:', adminUser.id)
    
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
createAdminUser()
  .then(() => {
    console.log('🎉 Script completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error en el script:', error)
    process.exit(1)
  })