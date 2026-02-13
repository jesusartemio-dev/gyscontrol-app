/**
 * API para operaciones sobre una tarea específica de una jornada
 * GET /api/horas-hombre/jornada/[id]/tarea/[tareaId] - Obtener detalle
 * PATCH /api/horas-hombre/jornada/[id]/tarea/[tareaId] - Actualizar miembros/horas
 * DELETE /api/horas-hombre/jornada/[id]/tarea/[tareaId] - Eliminar tarea
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string; tareaId: string }>
}

interface MiembroUpdate {
  usuarioId: string
  horas: number
  observaciones?: string
}

interface TareaUpdate {
  proyectoTareaId?: string | null
  nombreTareaExtra?: string | null
  descripcion?: string | null
  miembros: MiembroUpdate[]
}

// GET - Obtener detalle de una tarea
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId, tareaId } = await context.params

    const tarea = await prisma.registroHorasCampoTarea.findUnique({
      where: { id: tareaId },
      include: {
        proyectoTarea: {
          select: {
            id: true,
            nombre: true,
            proyectoActividad: { select: { id: true, nombre: true } }
          }
        },
        miembros: {
          include: {
            usuario: { select: { id: true, name: true, email: true } }
          }
        },
        registroCampo: {
          select: { id: true, supervisorId: true, estado: true }
        }
      }
    })

    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que pertenece a la jornada correcta
    if (tarea.registroCampoId !== jornadaId) {
      return NextResponse.json(
        { error: 'La tarea no pertenece a esta jornada' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tarea
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al obtener tarea:', error)
    return NextResponse.json(
      { error: 'Error obteniendo tarea' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar miembros y horas de una tarea
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId, tareaId } = await context.params
    const body = await request.json()
    const { miembros, proyectoTareaId, nombreTareaExtra, descripcion } = body as TareaUpdate

    // Obtener la tarea con su jornada
    const tarea = await prisma.registroHorasCampoTarea.findUnique({
      where: { id: tareaId },
      include: {
        registroCampo: {
          select: { id: true, supervisorId: true, estado: true }
        },
        miembros: true
      }
    })

    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que pertenece a la jornada correcta
    if (tarea.registroCampoId !== jornadaId) {
      return NextResponse.json(
        { error: 'La tarea no pertenece a esta jornada' },
        { status: 400 }
      )
    }

    // Verificar que el usuario es el supervisor
    if (tarea.registroCampo.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta tarea' },
        { status: 403 }
      )
    }

    // Verificar que la jornada está en estado 'iniciado'
    if (tarea.registroCampo.estado !== 'iniciado') {
      return NextResponse.json(
        { error: 'Solo se pueden editar tareas en jornadas con estado "iniciado"' },
        { status: 400 }
      )
    }

    // Validar miembros
    if (!miembros || miembros.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un miembro' },
        { status: 400 }
      )
    }

    // Validar horas de cada miembro
    for (const miembro of miembros) {
      if (!miembro.usuarioId) {
        return NextResponse.json(
          { error: 'Cada miembro debe tener un usuarioId' },
          { status: 400 }
        )
      }
      if (!miembro.horas || miembro.horas <= 0 || miembro.horas > 24) {
        return NextResponse.json(
          { error: 'Las horas de cada miembro deben estar entre 0.5 y 24' },
          { status: 400 }
        )
      }
    }

    // Usar transacción para actualizar tarea y miembros
    await prisma.$transaction(async (tx) => {
      // Update task fields if provided
      const tareaUpdate: Record<string, unknown> = {}
      if (proyectoTareaId !== undefined) {
        tareaUpdate.proyectoTareaId = proyectoTareaId || null
      }
      if (nombreTareaExtra !== undefined) {
        tareaUpdate.nombreTareaExtra = nombreTareaExtra || null
      }
      if (descripcion !== undefined) {
        tareaUpdate.descripcion = descripcion || null
      }

      if (Object.keys(tareaUpdate).length > 0) {
        await tx.registroHorasCampoTarea.update({
          where: { id: tareaId },
          data: tareaUpdate,
        })
      }

      // Eliminar miembros existentes
      await tx.registroHorasCampoMiembro.deleteMany({
        where: { registroCampoTareaId: tareaId }
      })

      // Crear nuevos miembros
      await tx.registroHorasCampoMiembro.createMany({
        data: miembros.map(m => ({
          registroCampoTareaId: tareaId,
          usuarioId: m.usuarioId,
          horas: m.horas,
          observaciones: m.observaciones || null
        }))
      })
    })

    // Obtener la tarea actualizada
    const tareaActualizada = await prisma.registroHorasCampoTarea.findUnique({
      where: { id: tareaId },
      include: {
        proyectoTarea: {
          select: {
            id: true,
            nombre: true,
            proyectoActividad: { select: { id: true, nombre: true } }
          }
        },
        miembros: {
          include: {
            usuario: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    const totalHoras = miembros.reduce((sum, m) => sum + m.horas, 0)

    console.log(`✅ JORNADA CAMPO: Actualizada tarea ${tareaId} con ${miembros.length} miembros (${totalHoras}h)`)

    return NextResponse.json({
      success: true,
      message: `Tarea actualizada con ${miembros.length} miembro(s) (${totalHoras}h)`,
      data: tareaActualizada
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al actualizar tarea:', error)
    return NextResponse.json(
      { error: 'Error actualizando tarea' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una tarea de la jornada
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId, tareaId } = await context.params

    // Obtener la tarea con su jornada
    const tarea = await prisma.registroHorasCampoTarea.findUnique({
      where: { id: tareaId },
      include: {
        registroCampo: {
          select: { id: true, supervisorId: true, estado: true }
        }
      }
    })

    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que pertenece a la jornada correcta
    if (tarea.registroCampoId !== jornadaId) {
      return NextResponse.json(
        { error: 'La tarea no pertenece a esta jornada' },
        { status: 400 }
      )
    }

    // Verificar que el usuario es el supervisor
    if (tarea.registroCampo.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta tarea' },
        { status: 403 }
      )
    }

    // Verificar que la jornada está en estado 'iniciado'
    if (tarea.registroCampo.estado !== 'iniciado') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar tareas en jornadas con estado "iniciado"' },
        { status: 400 }
      )
    }

    // Eliminar la tarea (cascade eliminará miembros)
    await prisma.registroHorasCampoTarea.delete({
      where: { id: tareaId }
    })

    console.log(`✅ JORNADA CAMPO: Eliminada tarea ${tareaId} de jornada ${jornadaId}`)

    return NextResponse.json({
      success: true,
      message: 'Tarea eliminada correctamente'
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al eliminar tarea:', error)
    return NextResponse.json(
      { error: 'Error eliminando tarea' },
      { status: 500 }
    )
  }
}
