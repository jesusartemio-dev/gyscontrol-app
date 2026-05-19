import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string; valId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

const CobroSchema = z.object({
  tipo: z.enum(['factoring', 'directo']),
  // Factoring — datos de operación
  financiera: z.string().max(200).optional().nullable(),
  tasaDescuentoPct: z.number().min(0).max(100).optional().nullable(),
  fechaDesembolso: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  numeroOperacion: z.string().max(100).optional().nullable(),
  numeroDocumentos: z.number().int().min(0).optional().nullable(),
  diasFinanciamiento: z.number().int().min(0).optional().nullable(),
  // Factoring — liquidación
  detraccionPct: z.number().min(0).max(100).optional().nullable(),
  detraccionMonto: z.number().min(0).optional().nullable(),
  excedentePct: z.number().min(0).max(100).optional().nullable(),
  excedenteMonto: z.number().min(0).optional().nullable(),
  valorAFinanciar: z.number().min(0).optional().nullable(),
  interesMonto: z.number().min(0).optional().nullable(),
  comisionEstructuracion: z.number().min(0).optional().nullable(),
  gastosAdicionales: z.number().min(0).optional().nullable(),
  igvGastos: z.number().min(0).optional().nullable(),
  montoADesembolsar: z.number().min(0).optional().nullable(),
  adelantoBanpro: z.number().min(0).optional().nullable(),
  saldoAGirar: z.number().optional().nullable(),
  // Legacy aliases
  montoDescontado: z.number().min(0).optional().nullable(),
  montoNeto: z.number().min(0).optional().nullable(),
  // Cobro directo
  confirmacionCliente: z.enum(['pendiente', 'confirmado', 'en_disputa']).optional().nullable(),
  fechaVencimientoPago: z.string().optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
})

type CobroData = z.infer<typeof CobroSchema>

function buildUpsertPayload(data: CobroData) {
  return {
    tipo: data.tipo,
    financiera: data.financiera ?? null,
    tasaDescuentoPct: data.tasaDescuentoPct ?? null,
    fechaDesembolso: data.fechaDesembolso ? new Date(data.fechaDesembolso) : null,
    fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
    numeroOperacion: data.numeroOperacion ?? null,
    numeroDocumentos: data.numeroDocumentos ?? null,
    diasFinanciamiento: data.diasFinanciamiento ?? null,
    // Liquidación
    detraccionPct: data.detraccionPct ?? null,
    detraccionMonto: data.detraccionMonto ?? null,
    excedentePct: data.excedentePct ?? null,
    excedenteMonto: data.excedenteMonto ?? null,
    valorAFinanciar: data.valorAFinanciar ?? null,
    interesMonto: data.interesMonto ?? null,
    comisionEstructuracion: data.comisionEstructuracion ?? null,
    gastosAdicionales: data.gastosAdicionales ?? null,
    igvGastos: data.igvGastos ?? null,
    montoADesembolsar: data.montoADesembolsar ?? null,
    adelantoBanpro: data.adelantoBanpro ?? null,
    saldoAGirar: data.saldoAGirar ?? null,
    // Legacy
    montoDescontado: data.montoDescontado ?? null,
    montoNeto: data.montoNeto ?? null,
    // Directo
    confirmacionCliente: data.confirmacionCliente ?? null,
    fechaVencimientoPago: data.fechaVencimientoPago ? new Date(data.fechaVencimientoPago) : null,
    observaciones: data.observaciones ?? null,
  }
}

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

// POST /api/proyectos/:id/valorizaciones/:valId/cobro — upsert cobro
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { valId } = await params
    const body = await request.json()
    const data = CobroSchema.parse(body)
    const payload = buildUpsertPayload(data)

    const cobro = await prisma.cobroValorizacion.upsert({
      where: { valorizacionId: valId },
      create: { valorizacionId: valId, ...payload },
      update: payload,
      include: { abonos: true },
    })

    return NextResponse.json(cobro)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    console.error('[POST /cobro]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
