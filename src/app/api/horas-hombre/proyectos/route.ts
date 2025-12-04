/**
 * API para obtener lista de todos los proyectos
 * 
 * Usado para llenar selectores en el frontend
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión y permisos
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ Lista proyectos: No hay sesión válida')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos (admin, coordinador, gestor)
    const userRole = session.user.role
    if (!['admin', 'coordinador', 'gestor'].includes(userRole)) {
      console.log('❌ Lista proyectos: Sin permisos suficientes', { role: userRole })
      return NextResponse.json(
        { error: 'Permisos insuficientes. Se requiere rol de administrador, coordinador o gestor' },
        { status: 403 }
      )
    }

    console.log('✅ Lista proyectos: Acceso autorizado', {
      userId: session.user.id,
      role: userRole
    })

    // 🔍 OBTENER LISTA SIMPLE DE PROYECTOS
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        codigo: true,
        cliente: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Encontrados ${proyectos.length} proyectos para lista`)

    return NextResponse.json({
      success: true,
      data: {
        proyectos
      }
    })

  } catch (error) {
    console.error('❌ Error obteniendo lista de proyectos:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}