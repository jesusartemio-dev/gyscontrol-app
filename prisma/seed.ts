import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Hash de la contraseña por defecto
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Crear usuario administrador por defecto
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gys.com' },
    update: {},
    create: {
      id: 'user-admin-default',
      email: 'admin@gys.com',
      name: 'Administrador GYS',
      password: hashedPassword,
      role: 'admin'
    }
  })

  console.log('✅ Usuario administrador creado:', {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role
  })

  // Crear usuario comercial de ejemplo
  const comercialUser = await prisma.user.upsert({
    where: { email: 'comercial@gys.com' },
    update: {},
    create: {
      id: 'user-comercial-default',
      email: 'comercial@gys.com',
      name: 'Usuario Comercial',
      password: hashedPassword,
      role: 'comercial'
    }
  })

  // Crear usuario de prueba con contraseña simple (sin hash)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: {
      id: 'user-test-default',
      email: 'test@test.com',
      name: 'Usuario de Prueba',
      password: 'test123', // Contraseña sin hash para testing
      role: 'comercial'
    }
  })

  console.log('✅ Usuario de prueba creado:', {
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
    role: testUser.role
  })

  console.log('✅ Usuario comercial creado:', {
    id: comercialUser.id,
    email: comercialUser.email,
    name: comercialUser.name,
    role: comercialUser.role
  })

  // Crear usuario logístico de ejemplo
  const logisticoUser = await prisma.user.upsert({
    where: { email: 'logistico@gys.com' },
    update: {},
    create: {
      id: 'user-logistico-default',
      email: 'logistico@gys.com',
      name: 'Usuario Logístico',
      password: hashedPassword,
      role: 'logistico'
    }
  })

  console.log('✅ Usuario logístico creado:', {
    id: logisticoUser.id,
    email: logisticoUser.email,
    name: logisticoUser.name,
    role: logisticoUser.role
  })

  // Nota: El modelo CalendarioLaboral fue removido del schema actual
  // Si necesitas calendario laboral, deberás agregarlo de vuelta al schema
  console.log('ℹ️ Calendario laboral omitido - modelo no disponible en schema actual')

  console.log('🎉 Seed completado exitosamente!')
  console.log('\n📋 Credenciales de acceso:')
  console.log('Email: admin@gys.com | Contraseña: admin123 | Rol: admin')
  console.log('Email: comercial@gys.com | Contraseña: admin123 | Rol: comercial')
  console.log('Email: logistico@gys.com | Contraseña: admin123 | Rol: logistico')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })