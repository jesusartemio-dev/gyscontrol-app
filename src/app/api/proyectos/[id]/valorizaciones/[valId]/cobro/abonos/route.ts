import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string; valId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

const AbonoSchema = z.object({
  monto: z.number().positive(),
  fecha: z.string().min(1),
  observaciones: z.string().max(300).optional().nullable(),
})

// POST /api/proyectos/:id/valorizaciones/:valId/cobro/abonos
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const cobro = await prisma.cobroValorizacion.findUnique({ where: { valorizacionId: valId } })
    if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado — registra primero el tipo de cobro' }, { status: 404 })

    const body = await request.json()
    const data = AbonoSchema.parse(body)

    const abono = await prisma.abonoValorizacion.create({
      data: {
        cobroId: cobro.id,
        monto: data.monto,
        fecha: new Date(data.fecha),
        observaciones: data.observaciones ?? null,
      },
    })

    return NextResponse.json(abono, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    console.error('[POST /cobro/abonos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE /api/proyectos/:id/valorizaciones/:valId/cobro/abonos?abonoId=xxx
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const abonoId = new URL(request.url).searchParams.get('abonoId')
    if (!abonoId) return NextResponse.json({ error: 'Falta abonoId' }, { status: 400 })

    await prisma.abonoValorizacion.delete({ where: { id: abonoId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /cobro/abonos]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
