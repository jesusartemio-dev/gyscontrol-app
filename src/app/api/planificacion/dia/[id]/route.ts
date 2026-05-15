import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { validarAsignacion } from '@/services/planificacion/validarAsignacion'
import type { PrismaTx, TurnoDia } from '@/services/planificacion/validarAsignacion'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

type Ctx = { params: Promise<{ id: string }> }

const UpdateSchema = z.object({
  proyectoId: z.string().min(1),
  esExcepcional: z.boolean().default(false),
  notas: z.string().optional(),
})

// PUT /api/planificacion/dia/:id
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_PLANIFICADOR.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    const celda = await prisma.planificacionDia.findUnique({ where: { id } })
    if (!celda) {
      return NextResponse.json({ error: 'Celda no encontrada' }, { status: 404 })
    }
    if (celda.solicitudAusenciaId) {
      return NextResponse.json(
        { error: 'Celda de ausencia — no editable desde planificación' },
        { status: 409 },
      )
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const validacion = await validarAsignacion(
        celda.userId,
        celda.fecha,
        celda.turno as TurnoDia,
        data.proyectoId,
        data.esExcepcional,
        tx as unknown as PrismaTx,
      )
      if (!validacion.valido) {
        return { error: validacion.errores[0] }
      }

      const updated = await tx.planificacionDia.update({
        where: { id },
        data: {
          proyectoId: data.proyectoId,
          esExcepcional: data.esExcepcional,
          notas: data.notas ?? null,
          updatedById: session.user.id,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: id,
          accion: 'planificacion.celda_actualizada',
          usuarioId: session.user.id,
          descripcion: `Celda editada`,
          cambios: JSON.stringify(data),
        },
      })

      return { celda: updated, warnings: validacion.warnings }
    })

    if ('error' in resultado && resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: 422 })
    }

    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[PUT /api/planificacion/dia/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE /api/planificacion/dia/:id
export async function DELETE(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_PLANIFICADOR.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await context.params
    const celda = await prisma.planificacionDia.findUnique({ where: { id } })
    if (!celda) {
      return NextResponse.json({ error: 'Celda no encontrada' }, { status: 404 })
    }
    if (celda.solicitudAusenciaId) {
      return NextResponse.json(
        { error: 'Las celdas de ausencia solo se eliminan via cancelación/rechazo de ausencia' },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.planificacionDia.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: id,
          accion: 'planificacion.celda_eliminada',
          usuarioId: session.user.id,
          descripcion: `Celda eliminada`,
          cambios: JSON.stringify({ userId: celda.userId, fecha: celda.fecha, turno: celda.turno }),
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/planificacion/dia/:id]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
