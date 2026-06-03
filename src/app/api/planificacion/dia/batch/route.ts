import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { batchAsignar } from '@/services/planificacion/batchAsignar'
import type { PrismaTx } from '@/services/planificacion/validarAsignacion'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const AsignacionSchema = z.object({
  userId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
  turno: z.enum(['turno_a', 'turno_b', 'turno_c']).default('turno_a'),
  proyectoId: z.string().min(1),
  esExcepcional: z.boolean().default(false),
  notas: z.string().nullable().optional(),
})

export const BatchSchema = z.object({
  asignaciones: z.array(AsignacionSchema).min(1).max(50),
})

// POST /api/planificacion/dia/batch
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
    const { asignaciones } = BatchSchema.parse(body)

    const resultado = await prisma.$transaction(async (tx) =>
      batchAsignar(asignaciones, session.user.id, tx as unknown as PrismaTx),
    )

    const total = asignaciones.length
    const status = resultado.omitidas.length / total > 0.3 ? 207 : 200

    return NextResponse.json(resultado, { status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/planificacion/dia/batch]', error)
    return NextResponse.json({ error: 'Error al procesar el batch' }, { status: 422 })
  }
}
