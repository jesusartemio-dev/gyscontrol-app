// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/[id]/fases/[faseId]
// 🔧 Descripción: API para gestionar fase específica de una cotización
// ✅ DELETE: Eliminar fase específica
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/cotizacion/[id]/fases/[faseId] - Eliminar fase específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const { id, faseId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { comercial: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar fases' }, { status: 403 })
    }

    // Verificar que la fase existe y pertenece a la cotización
    const fase = await prisma.cotizacionFase.findFirst({
      where: {
        id: faseId,
        cotizacionId: id
      },
      include: {
        cotizacion_edt: {
          include: {
            cotizacionActividad: {
              include: {
                cotizacionTareas: true
              }
            }
          }
        }
      }
    })

    if (!fase) {
      return NextResponse.json({
        error: 'Fase no encontrada o no pertenece a esta cotización'
      }, { status: 404 })
    }

    // Verificar si tiene elementos dependientes
    const totalEdts = fase.cotizacion_edt.length
    const totalActividades = fase.cotizacion_edt.reduce((sum, edt) => sum + edt.cotizacionActividad.length, 0)
    const totalTareas = fase.cotizacion_edt.reduce((sum, edt) =>
      sum + edt.cotizacionActividad.reduce((sumAct, act) => sumAct + act.cotizacionTareas.length, 0), 0
    )

    if (totalEdts > 0 || totalActividades > 0 || totalTareas > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar la fase porque tiene elementos dependientes',
        details: {
          edts: totalEdts,
          actividades: totalActividades,
          tareas: totalTareas
        }
      }, { status: 400 })
    }

    // Eliminar la fase (los elementos dependientes ya fueron verificados como vacíos)
    await prisma.cotizacionFase.delete({
      where: { id: faseId }
    })

    return NextResponse.json({
      success: true,
      message: 'Fase eliminada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando fase:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}