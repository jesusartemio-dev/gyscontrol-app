import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function GET() {
  return POST()
}

export async function POST() {
  try {
    console.log('🔐 Creando usuarios administradores...')

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10)

    // Crear usuario administrador
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@gys.com' },
      update: {},
      create: {
        id: `user-admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: 'admin@gys.com',
        name: 'Administrador GYS',
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date()
      }
    })

    // Crear usuario comercial
    const comercialUser = await prisma.user.upsert({
      where: { email: 'comercial@gys.com' },
      update: {},
      create: {
        id: `user-comercial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: 'comercial@gys.com',
        name: 'Usuario Comercial',
        password: hashedPassword,
        role: 'comercial',
        emailVerified: new Date()
      }
    })

    // Crear usuario logístico
    const logisticoUser = await prisma.user.upsert({
      where: { email: 'logistico@gys.com' },
      update: {},
      create: {
        id: `user-logistico-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: 'logistico@gys.com',
        name: 'Usuario Logístico',
        password: hashedPassword,
        role: 'logistico',
        emailVerified: new Date()
      }
    })

    console.log('✅ Usuarios creados exitosamente')

    return NextResponse.json({
      message: 'Usuarios administradores creados exitosamente',
      users: [
        {
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          password: 'admin123' // ⚠️ Solo para configuración inicial
        },
        {
          email: comercialUser.email,
          name: comercialUser.name,
          role: comercialUser.role,
          password: 'admin123'
        },
        {
          email: logisticoUser.email,
          name: logisticoUser.name,
          role: logisticoUser.role,
          password: 'admin123'
        }
      ],
      warning: '⚠️ IMPORTANTE: Cambia estas contraseñas después del primer login'
    })

  } catch (error) {
    console.error('❌ Error creando usuarios:', error)
    return NextResponse.json({
      error: 'Error creando usuarios administradores',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
