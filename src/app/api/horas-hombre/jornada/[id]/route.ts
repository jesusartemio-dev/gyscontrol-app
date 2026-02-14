/**
 * API para operaciones sobre una jornada específica
 * GET /api/horas-hombre/jornada/[id] - Obtener detalle
 * DELETE /api/horas-hombre/jornada/[id] - Eliminar (iniciado o rechazado)
 * PATCH /api/horas-hombre/jornada/[id] - Actualizar campos (solo si iniciado)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgresoService } from '@/lib/services/progresoService'
import { limpiarHorasJornadaRechazada } from '@/lib/utils/jornadaCleanup'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener detalle de una jornada
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId } = await context.params

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true, edt: { select: { id: true, nombre: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        aprobadoPor: { select: { id: true, name: true, email: true } },
        tareas: {
          include: {
            proyectoTarea: {
              select: {
                id: true,
                nombre: true,
                porcentajeCompletado: true,
                proyectoActividad: { select: { id: true, nombre: true } }
              }
            },
            miembros: {
              include: {
                usuario: { select: { id: true, name: true, email: true, role: true } }
              }
            }
          }
        }
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    const cantidadTareas = jornada.tareas.length
    const cantidadMiembros = new Set(
      jornada.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
    ).size
    const totalHoras = jornada.tareas.reduce(
      (sum, t) => sum + t.miembros.reduce((s, m) => s + m.horas, 0),
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        ...jornada,
        cantidadTareas,
        cantidadMiembros,
        totalHoras
      }
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al obtener:', error)
    return NextResponse.json(
      { error: 'Error obteniendo jornada' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una jornada (solo si está en estado 'iniciado')
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId } = await context.params

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        estado: true,
        supervisorId: true,
        proyecto: { select: { codigo: true } }
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el supervisor
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta jornada' },
        { status: 403 }
      )
    }

    // Solo se puede eliminar si está en estado 'iniciado' o 'rechazado'
    if (jornada.estado !== 'iniciado' && jornada.estado !== 'rechazado') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar jornadas en estado "iniciado" o "rechazado"' },
        { status: 400 }
      )
    }

    let tareasAfectadas: string[] = []

    if (jornada.estado === 'rechazado') {
      // Revertir horas del cronograma y eliminar RegistroHoras
      await prisma.$transaction(async (tx) => {
        const cleanup = await limpiarHorasJornadaRechazada(tx, jornadaId)
        tareasAfectadas = cleanup.tareasAfectadas
        await tx.registroHorasCampo.delete({ where: { id: jornadaId } })
      })
    } else {
      // Estado 'iniciado': no hay horas que revertir
      await prisma.registroHorasCampo.delete({ where: { id: jornadaId } })
    }

    // Actualizar progreso de tareas afectadas
    for (const tareaId of tareasAfectadas) {
      try {
        await ProgresoService.actualizarProgresoTarea(tareaId)
      } catch (err) {
        console.error(`⚠️ Error actualizando progreso tarea ${tareaId}:`, err)
      }
    }

    console.log(`✅ JORNADA CAMPO: Eliminada jornada ${jornadaId} del proyecto ${jornada.proyecto.codigo}`)

    return NextResponse.json({
      success: true,
      message: 'Jornada eliminada correctamente'
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al eliminar:', error)
    return NextResponse.json(
      { error: 'Error eliminando jornada' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar campos de una jornada (solo si está en estado 'iniciado')
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId } = await context.params
    const body = await request.json()

    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        estado: true,
        supervisorId: true
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el supervisor
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta jornada' },
        { status: 403 }
      )
    }

    // Solo se puede modificar si está en estado 'iniciado'
    if (jornada.estado !== 'iniciado') {
      return NextResponse.json(
        { error: 'Solo se pueden modificar jornadas en estado "iniciado"' },
        { status: 400 }
      )
    }

    // Campos que se pueden actualizar
    const allowedFields = ['objetivosDia', 'ubicacion', 'personalPlanificado', 'descripcion']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }

    const jornadaActualizada = await prisma.registroHorasCampo.update({
      where: { id: jornadaId },
      data: updateData,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true } }
      }
    })

    console.log(`✅ JORNADA CAMPO: Actualizada jornada ${jornadaId}`)

    return NextResponse.json({
      success: true,
      message: 'Jornada actualizada correctamente',
      data: jornadaActualizada
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al actualizar:', error)
    return NextResponse.json(
      { error: 'Error actualizando jornada' },
      { status: 500 }
    )
  }
}
