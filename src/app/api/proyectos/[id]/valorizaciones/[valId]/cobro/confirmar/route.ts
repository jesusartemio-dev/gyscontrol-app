import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { procesarConfirmacionFactoring } from '@/lib/services/factoringCobro'

type Ctx = { params: Promise<{ id: string; valId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const ConfirmarSchema = z.object({
  fechaConfirmacion: z.string().min(1),
})

// POST /api/proyectos/:id/valorizaciones/:valId/cobro/confirmar
// Transición deliberada 'desembolsada' -> 'confirmada': libera el excedente
// retenido (PagoCobro real) y cierra la operación. Idempotente: si ya está
// 'confirmada', bloquea en vez de duplicar el PagoCobro del excedente.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const body = await request.json()
    const data = ConfirmarSchema.parse(body)

    const cobroExistente = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: valId } })
    if (!cobroExistente) {
      return NextResponse.json({ error: 'No existe una operación de cobro para esta valorización' }, { status: 404 })
    }

    const cobro = await prisma.$transaction(async (tx) => {
      await procesarConfirmacionFactoring(cobroExistente.id, new Date(data.fechaConfirmacion), tx)
      return tx.cobroValorizacion.findUniqueOrThrow({
        where: { id: cobroExistente.id },
        include: { abonos: true },
      })
    })

    return NextResponse.json(cobro)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[POST /cobro/confirmar]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
