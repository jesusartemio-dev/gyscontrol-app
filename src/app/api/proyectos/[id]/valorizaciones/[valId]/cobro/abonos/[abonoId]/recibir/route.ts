import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { marcarAbonoFactoringRecibido } from '@/lib/services/factoringCobro'

type Ctx = { params: Promise<{ id: string; valId: string; abonoId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

const RecibirSchema = z.object({
  montoReal: z.number().positive(),
  fechaReal: z.string().min(1),
  observaciones: z.string().max(300).optional().nullable(),
  numeroConstanciaBN: z.string().max(100).optional().nullable(),
  numeroComprobanteRetencion: z.string().max(100).optional().nullable(),
})

// POST /api/proyectos/:id/valorizaciones/:valId/cobro/abonos/:abonoId/recibir
// Marca un "cobro esperado" (saldo_girar, detraccion o excedente) como
// recibido, con su monto real (puede diferir del teórico por mora). Si el
// abono es 'excedente', además cierra la operación como 'confirmada' —
// reemplaza lo que antes hacía POST /cobro/confirmar.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId, abonoId } = await params
    const body = await request.json()
    const data = RecibirSchema.parse(body)

    const cobro = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: valId } })
    if (!cobro) {
      return NextResponse.json({ error: 'No existe una operación de cobro para esta valorización' }, { status: 404 })
    }

    const abonoExistente = await prisma.abonoValorizacion.findUnique({ where: { id: abonoId } })
    if (!abonoExistente || abonoExistente.cobroId !== cobro.id) {
      return NextResponse.json({ error: 'El cobro esperado no pertenece a esta operación' }, { status: 404 })
    }

    const abono = await prisma.$transaction(async (tx) => {
      return marcarAbonoFactoringRecibido(
        abonoId,
        data.montoReal,
        new Date(data.fechaReal),
        tx,
        data.observaciones,
        data.numeroConstanciaBN,
        data.numeroComprobanteRetencion
      )
    })

    return NextResponse.json(abono)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[POST /cobro/abonos/:abonoId/recibir]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
