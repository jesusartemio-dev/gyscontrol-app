// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/edts/[edtId]
// 🔧 Descripción: API para gestionar EDT específico de una cotización
// ✅ DELETE: Eliminar EDT específico
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ DELETE /api/cotizaciones/[id]/edts/[edtId] - Eliminar EDT específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  try {
    const { id, edtId } = await params
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
      return NextResponse.json({ error: 'No tiene permisos para eliminar EDTs' }, { status: 403 })
    }

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      },
      include: {
        actividadesDirectas: {
          include: {
            tareas: true
          }
        }
      }
    })

    if (!edt) {
      return NextResponse.json({
        error: 'EDT no encontrado o no pertenece a esta cotización'
      }, { status: 404 })
    }

    // ✅ ELIMINACIÓN EN CASCADA: Eliminar elementos dependientes primero (5 niveles)
    // 1. Eliminar tareas de actividades directas
    for (const actividad of edt.actividadesDirectas) {
      await prisma.cotizacionTarea.deleteMany({
        where: { cotizacionActividadId: actividad.id }
      })
    }

    // 2. Eliminar actividades directas
    await prisma.cotizacionActividad.deleteMany({
      where: { cotizacionEdtId: edtId }
    })

    // 3. Finalmente eliminar el EDT
    await prisma.cotizacionEdt.delete({
      where: { id: edtId }
    })

    return NextResponse.json({
      success: true,
      message: 'EDT eliminado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error eliminando EDT:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}