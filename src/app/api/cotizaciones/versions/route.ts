// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/versions
// 🔧 Descripción: API para gestión de versiones de cotizaciones
// ✅ POST: Crear nueva versión
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ POST /api/cotizaciones/versions - Crear nueva versión
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { cotizacionId, nombre, descripcion, cambios, motivoCambio, snapshot } = await request.json()

    if (!cotizacionId || !nombre || !snapshot) {
      return NextResponse.json({
        error: 'Faltan campos requeridos: cotizacionId, nombre, snapshot'
      }, { status: 400 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Obtener el número de versión siguiente
    const ultimaVersion = await prisma.cotizacionVersion.findFirst({
      where: { cotizacionId },
      orderBy: { version: 'desc' }
    })

    const nuevaVersion = (ultimaVersion?.version || 0) + 1

    // Crear la nueva versión
    const version = await prisma.cotizacionVersion.create({
      data: {
        cotizacionId,
        version: nuevaVersion,
        nombre,
        descripcion,
        cambios,
        motivoCambio,
        snapshot,
        usuarioId: session.user.id
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear versión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}