// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/dependencias/[dependenciaId]
// 🔧 Descripción: Edición y eliminación de dependencia individual
// ✅ PUT: cambiar tipo y desfase · DELETE: eliminar
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

const updateSchema = z.object({
  tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).optional(),
  lagMinutos: z.number().int().optional(),
})

// ✅ PUT /api/proyectos/[id]/cronograma/dependencias/[dependenciaId] — tipo y desfase
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dependenciaId: string }> }
) {
  try {
    const { id: proyectoId, dependenciaId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const datos = updateSchema.parse(await request.json())
    const dependencia = await prisma.proyectoDependenciasTarea.findFirst({
      where: { id: dependenciaId, tareaOrigen: { proyectoEdt: { proyectoId } } },
      include: { tareaOrigen: { select: { proyectoCronogramaId: true } } },
    })
    if (!dependencia) {
      return NextResponse.json({ error: 'Dependencia no encontrada o no pertenece a este proyecto' }, { status: 404 })
    }
    const permiso = await validarPermisoCronogramaPorTarea(dependencia.tareaOrigenId)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(dependencia.tareaOrigen.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    const actualizada = await prisma.proyectoDependenciasTarea.update({
      where: { id: dependenciaId },
      data: { ...(datos.tipo && { tipo: datos.tipo }), ...(datos.lagMinutos !== undefined && { lagMinutos: datos.lagMinutos }) },
    })
    return NextResponse.json({ success: true, data: actualizada })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    logger.error('❌ Error actualizando dependencia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

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
