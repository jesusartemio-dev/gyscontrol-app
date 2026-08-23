// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/versions
// 🔧 Descripción: API para obtener versiones de una cotización
// ✅ GET: Obtener versiones de una cotización
// ===================================================

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/cotizaciones/[id]/versions - Obtener versiones de una cotización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe y el usuario tiene acceso
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        user: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos (usuario debe ser el comercial o admin)
    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = tieneRol(session, ['admin', 'gerente']) || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para ver las versiones' }, { status: 403 })
    }

    // Obtener versiones ordenadas por número de versión descendente
    const versiones = await prisma.cotizacionVersion.findMany({
      where: { cotizacionId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { version: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(versiones)
  } catch (error) {
    console.error('❌ Error al obtener versiones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}