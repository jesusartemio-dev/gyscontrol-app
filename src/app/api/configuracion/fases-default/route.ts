// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/configuracion/fases-default
// 🔧 Descripción: API para obtener fases por defecto del sistema
// ✅ GET: Retornar lista de fases por defecto
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/configuracion/fases-default - Obtener fases por defecto
export async function GET(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo usuarios autenticados pueden ver fases)
    const userRole = session.user.role
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial'

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver fases' }, { status: 403 })
    }

    // Obtener todas las fases por defecto activas
    const fasesDefault = await prisma.faseDefault.findMany({
      where: {
        activo: true
      },
      orderBy: {
        orden: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: fasesDefault
    })

  } catch (error) {
    console.error('❌ Error obteniendo fases por defecto:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}