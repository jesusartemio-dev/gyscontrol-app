import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string; valId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

const CobroSchema = z.object({
  tipo: z.enum(['factoring', 'directo']),
  // Factoring
  financiera: z.string().max(200).optional().nullable(),
  tasaDescuentoPct: z.number().min(0).max(100).optional().nullable(),
  montoDescontado: z.number().min(0).optional().nullable(),
  montoNeto: z.number().min(0).optional().nullable(),
  fechaDesembolso: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  numeroOperacion: z.string().max(100).optional().nullable(),
  // Directo
  confirmacionCliente: z.enum(['pendiente', 'confirmado', 'en_disputa']).optional().nullable(),
  fechaVencimientoPago: z.string().optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

// GET /api/proyectos/:id/valorizaciones/:valId/cobro
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { valId } = await params
    const cobro = await prisma.cobroValorizacion.findUnique({
      where: { valorizacionId: valId },
      include: { abonos: { orderBy: { fecha: 'asc' } } },
    })

    return NextResponse.json(cobro)
  } catch (error) {
    console.error('[GET /cobro]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/proyectos/:id/valorizaciones/:valId/cobro — crear cobro
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const body = await request.json()
    const data = CobroSchema.parse(body)

    const cobro = await prisma.cobroValorizacion.upsert({
      where: { valorizacionId: valId },
      create: {
        valorizacionId: valId,
        tipo: data.tipo,
        financiera: data.financiera ?? null,
        tasaDescuentoPct: data.tasaDescuentoPct ?? null,
        montoDescontado: data.montoDescontado ?? null,
        montoNeto: data.montoNeto ?? null,
        fechaDesembolso: data.fechaDesembolso ? new Date(data.fechaDesembolso) : null,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        numeroOperacion: data.numeroOperacion ?? null,
        confirmacionCliente: data.confirmacionCliente ?? null,
        fechaVencimientoPago: data.fechaVencimientoPago ? new Date(data.fechaVencimientoPago) : null,
        observaciones: data.observaciones ?? null,
      },
      update: {
        tipo: data.tipo,
        financiera: data.financiera ?? null,
        tasaDescuentoPct: data.tasaDescuentoPct ?? null,
        montoDescontado: data.montoDescontado ?? null,
        montoNeto: data.montoNeto ?? null,
        fechaDesembolso: data.fechaDesembolso ? new Date(data.fechaDesembolso) : null,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        numeroOperacion: data.numeroOperacion ?? null,
        confirmacionCliente: data.confirmacionCliente ?? null,
        fechaVencimientoPago: data.fechaVencimientoPago ? new Date(data.fechaVencimientoPago) : null,
        observaciones: data.observaciones ?? null,
      },
      include: { abonos: true },
    })

    return NextResponse.json(cobro)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    console.error('[POST /cobro]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
