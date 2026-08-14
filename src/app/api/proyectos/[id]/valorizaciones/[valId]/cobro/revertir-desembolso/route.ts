import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { revertirDesembolsoFactoring } from '@/lib/services/factoringCobro'

type Ctx = { params: Promise<{ id: string; valId: string }> }

// Mismos roles que ya editan/anulan una CxC (cuentas-cobrar/[id]/route.ts) —
// Sub-fase E, Caso 1: revertir un desembolso intacto no toca Valorizacion.
const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const RevertirSchema = z.object({
  motivo: z.string().trim().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

// POST /api/proyectos/:id/valorizaciones/:valId/cobro/revertir-desembolso
// Revierte (Sub-fase E, Caso 1) un desembolso de factoring ya guardado, cuando
// ningún evento posterior (saldo_girar/detraccion/excedente) se marcó recibido
// todavía. Anula (no borra) los PagoCobro reales, borra los AbonoValorizacion
// (sin rastro propio — el rastro vive en el PagoCobro anulado) y deja la
// operación en 'en_negociacion' con fechaDesembolso en null, lista para
// corregir y volver a desembolsar.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const body = await request.json()
    const data = RevertirSchema.parse(body)

    const cobro = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: valId } })
    if (!cobro) {
      return NextResponse.json({ error: 'No existe una operación de cobro para esta valorización' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await revertirDesembolsoFactoring(cobro.id, data.motivo, tx)
    })

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo: 'COBRO_VALORIZACION',
        entidadId: cobro.id,
        accion: 'factoring.revertir_desembolso',
        usuarioId: session.user.id,
        descripcion: `Desembolso de factoring revertido — ${data.motivo}`,
      },
    })

    const actualizado = await prisma.cobroValorizacion.findUnique({
      where: { id: cobro.id },
      include: { abonos: true },
    })
    return NextResponse.json(actualizado)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    const message = error instanceof Error ? error.message : 'Error del servidor'
    console.error('[POST /cobro/revertir-desembolso]', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
