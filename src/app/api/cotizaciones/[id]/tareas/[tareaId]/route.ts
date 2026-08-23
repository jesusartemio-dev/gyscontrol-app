// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/tareas/[tareaId]
// 🔧 Descripción: API para gestionar tarea específica de una cotización
// ✅ DELETE: Eliminar tarea específica
// ===================================================

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/cotizaciones/[id]/tareas/[tareaId] - Eliminar tarea específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  try {
    const { id, tareaId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = tieneRol(session, ['admin', 'gerente', 'comercial']) || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar tareas' }, { status: 403 })
    }

    // Verificar que la tarea existe y pertenece a la cotización
    const tarea = await prisma.cotizacionTarea.findFirst({
      where: {
        id: tareaId,
        cotizacionActividad: {
          ...(await getActividadParentCondition(id, tareaId))
        }
      }
    })

    if (!tarea) {
      return NextResponse.json({
        error: 'Tarea no encontrada o no pertenece a esta cotización'
      }, { status: 404 })
    }

    // Las tareas no tienen elementos dependientes, se pueden eliminar directamente
    await prisma.cotizacionTarea.delete({
      where: { id: tareaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Tarea eliminada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando tarea:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función auxiliar para obtener condición de padre de actividad
async function getActividadParentCondition(cotizacionId: string, tareaId: string) {
  // Obtener la actividad de la tarea
  const tarea = await prisma.cotizacionTarea.findUnique({
    where: { id: tareaId },
    select: {
      cotizacionActividadId: true
    }
  })

  if (!tarea?.cotizacionActividadId) return {}

  // Verificar si la actividad pertenece a un EDT de esta cotización
  const actividad = await prisma.cotizacionActividad.findUnique({
    where: { id: tarea.cotizacionActividadId },
    select: {
      cotizacionEdtId: true
    }
  })

  if (!actividad?.cotizacionEdtId) return {}

  return {
    cotizacionEdt: {
      cotizacionId
    }
  }
}