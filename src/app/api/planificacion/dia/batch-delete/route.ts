import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const BatchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
})

// POST /api/planificacion/dia/batch-delete
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_PLANIFICADOR.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { ids } = BatchDeleteSchema.parse(body)

    const resultado = await prisma.$transaction(async (tx) => {
      const celdas = await tx.planificacionDia.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true, fecha: true, turno: true, solicitudAusenciaId: true },
      })

      // Las celdas de ausencia no se eliminan desde planificación (se cancelan/rechazan
      // desde el flujo de ausencias), igual que en el DELETE individual.
      const eliminables = celdas.filter((c) => !c.solicitudAusenciaId)
      const omitidas = celdas.filter((c) => c.solicitudAusenciaId).map((c) => c.id)

      if (eliminables.length > 0) {
        await tx.planificacionDia.deleteMany({
          where: { id: { in: eliminables.map((c) => c.id) } },
        })

        for (const c of eliminables) {
          await tx.auditLog.create({
            data: {
              id: crypto.randomUUID(),
              entidadTipo: 'PLANIFICACION_DIA',
              entidadId: c.id,
              accion: 'planificacion.celda_eliminada',
              usuarioId: session.user.id,
              descripcion: `Celda eliminada (batch)`,
              cambios: JSON.stringify({ userId: c.userId, fecha: c.fecha, turno: c.turno }),
            },
          })
        }
      }

      return { eliminadas: eliminables.length, omitidas }
    })

    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/planificacion/dia/batch-delete]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
