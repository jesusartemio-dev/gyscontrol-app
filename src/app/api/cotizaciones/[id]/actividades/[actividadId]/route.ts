// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/actividades/[actividadId]
// 🔧 Descripción: API para gestionar actividad específica de una cotización
// ✅ DELETE: Eliminar actividad específica
// ===================================================

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/cotizaciones/[id]/actividades/[actividadId] - Eliminar actividad específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actividadId: string }> }
) {
  try {
    const { id, actividadId } = await params
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
      return NextResponse.json({ error: 'No tiene permisos para eliminar actividades' }, { status: 403 })
    }

    // Verificar que la actividad existe y pertenece a la cotización
    const actividad = await prisma.cotizacionActividad.findFirst({
      where: {
        id: actividadId,
        ...(await getActividadParentCondition(id, actividadId))
      },
      include: {
        cotizacionTarea: true
      }
    })

    if (!actividad) {
      return NextResponse.json({
        error: 'Actividad no encontrada o no pertenece a esta cotización'
      }, { status: 404 })
    }

    // ✅ ELIMINACIÓN EN CASCADA: Eliminar tareas dependientes primero
    await prisma.cotizacionTarea.deleteMany({
      where: { cotizacionActividadId: actividadId }
    })

    // Eliminar la actividad
    await prisma.cotizacionActividad.delete({
      where: { id: actividadId }
    })

    return NextResponse.json({
      success: true,
      message: 'Actividad eliminada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando actividad:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función auxiliar para obtener condición de padre de actividad
async function getActividadParentCondition(cotizacionId: string, actividadId: string) {
  // Verificar si la actividad pertenece a un EDT de esta cotización
  const actividad = await prisma.cotizacionActividad.findUnique({
    where: { id: actividadId },
    select: {
      cotizacionEdtId: true
    }
  })

  if (!actividad || !actividad.cotizacionEdtId) return {}

  return {
    cotizacionEdt: {
      cotizacionId
    }
  }
}