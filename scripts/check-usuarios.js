// ===================================================
// 📁 Archivo: check-usuarios.js
// 📌 Descripción: Script para verificar usuarios en la base de datos
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-09-19
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsuarios() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...')

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Total de usuarios encontrados: ${usuarios.length}`)

    if (usuarios.length > 0) {
      console.log('\n👥 Lista de usuarios:')
      usuarios.forEach((usuario, index) => {
        console.log(`${index + 1}. ${usuario.name} (${usuario.email}) - Rol: ${usuario.role}`)
      })
    } else {
      console.log('\n⚠️  No hay usuarios en la base de datos.')
      console.log('💡 Puedes crear usuarios desde: http://localhost:3001/admin/usuarios')
    }

  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsuarios()