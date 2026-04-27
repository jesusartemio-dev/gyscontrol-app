// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/dependencias/[dependenciaId]
// 🔧 Descripción: Eliminación de dependencia individual
// ✅ DELETE: Eliminar una dependencia específica
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'

// ✅ DELETE /api/proyectos/[id]/cronograma/dependencias/[dependenciaId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔍 Verificar que la dependencia existe y pertenece al proyecto
    const tareaIds = await prisma.proyectoTarea.findMany({
      where: {
        proyectoEdt: { proyectoId }
      },
      select: { id: true }
    }).then((tasks: { id: string }[]) => tasks.map((t) => t.id))

    const dependencia = await prisma.proyectoDependenciasTarea.findFirst({
      where: {
        id: dependenciaId,
        tareaOrigenId: { in: tareaIds }
      }
    })

    if (!dependencia) {
      return NextResponse.json({
        error: 'Dependencia no encontrada o no pertenece a este proyecto'
      }, { status: 404 })
    }

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPermisoCronogramaPorTarea(dependencia.tareaOrigenId)
    if (!permiso.ok) return permiso.response

    // ✅ Eliminar dependencia
    await prisma.proyectoDependenciasTarea.delete({
      where: { id: dependenciaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Dependencia eliminada correctamente'
    })

  } catch (error) {
    logger.error('❌ Error eliminando dependencia:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
