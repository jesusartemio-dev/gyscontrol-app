import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { validarAsignacion } from '@/services/planificacion/validarAsignacion'
import type { PrismaTx } from '@/services/planificacion/validarAsignacion'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const DiaSchema = z.object({
  userId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  turno: z.enum(['dia_completo', 'turno_a', 'turno_b', 'turno_c', 'turno_noche']),
  proyectoId: z.string().min(1),
  esExcepcional: z.boolean().default(false),
  notas: z.string().optional(),
})

// POST /api/planificacion/dia — upsert por userId+fecha+turno
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_PLANIFICADOR.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para planificar' }, { status: 403 })
    }

    const body = await request.json()
    const data = DiaSchema.parse(body)
    const fecha = new Date(data.fecha + 'T00:00:00.000Z')

    const resultado = await prisma.$transaction(async (tx) => {
      const validacion = await validarAsignacion(
        data.userId,
        fecha,
        data.turno,
        data.proyectoId,
        data.esExcepcional,
        tx as unknown as PrismaTx,
      )
      if (!validacion.valido) {
        return { error: validacion.errores[0], statusCode: 422 }
      }

      const existente = await tx.planificacionDia.findFirst({
        where: { userId: data.userId, fecha, turno: data.turno },
      })

      if (existente) {
        if (existente.solicitudAusenciaId) {
          return {
            error: {
              codigo: 'celda_ausencia',
              mensaje: 'Esta celda pertenece a una ausencia y no puede modificarse desde planificación',
            },
            statusCode: 409,
          }
        }

        const updated = await tx.planificacionDia.update({
          where: { id: existente.id },
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
            entidadId: updated.id,
            accion: 'planificacion.celda_actualizada',
            usuarioId: session.user.id,
            descripcion: `Celda actualizada para ${data.userId} en ${data.fecha}`,
            cambios: JSON.stringify(data),
          },
        })

        return { celda: updated, accion: 'actualizada', warnings: validacion.warnings }
      }

      const created = await tx.planificacionDia.create({
        data: {
          userId: data.userId,
          fecha,
          turno: data.turno,
          proyectoId: data.proyectoId,
          esExcepcional: data.esExcepcional,
          notas: data.notas ?? null,
          createdById: session.user.id,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: created.id,
          accion: 'planificacion.celda_asignada',
          usuarioId: session.user.id,
          descripcion: `Celda asignada para ${data.userId} en ${data.fecha}`,
          cambios: JSON.stringify(data),
        },
      })

      return { celda: created, accion: 'creada', warnings: validacion.warnings }
    })

    if ('error' in resultado && resultado.error) {
      const sc = (resultado as any).statusCode ?? 422
      return NextResponse.json({ error: resultado.error }, { status: sc })
    }

    return NextResponse.json(resultado, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/planificacion/dia]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
