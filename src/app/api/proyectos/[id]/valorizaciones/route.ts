import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// Calcula todos los campos derivados de una valorización
function calcularMontos(data: {
  montoValorizacion: number
  acumuladoAnterior: number
  presupuestoContractual: number
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
}) {
  const acumuladoActual = data.acumuladoAnterior + data.montoValorizacion
  const saldoPorValorizar = data.presupuestoContractual - acumuladoActual
  const porcentajeAvance = data.presupuestoContractual > 0
    ? (acumuladoActual / data.presupuestoContractual) * 100
    : 0

  const descuentoComercialMonto = data.montoValorizacion * data.descuentoComercialPorcentaje / 100
  const adelantoMonto = data.montoValorizacion * data.adelantoPorcentaje / 100
  const subtotal = data.montoValorizacion - descuentoComercialMonto - adelantoMonto
  const igvMonto = subtotal * data.igvPorcentaje / 100
  const fondoGarantiaMonto = subtotal * data.fondoGarantiaPorcentaje / 100
  const netoARecibir = subtotal + igvMonto - fondoGarantiaMonto

  return {
    acumuladoActual: Math.round(acumuladoActual * 100) / 100,
    saldoPorValorizar: Math.round(saldoPorValorizar * 100) / 100,
    porcentajeAvance: Math.round(porcentajeAvance * 100) / 100,
    descuentoComercialMonto: Math.round(descuentoComercialMonto * 100) / 100,
    adelantoMonto: Math.round(adelantoMonto * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    igvMonto: Math.round(igvMonto * 100) / 100,
    fondoGarantiaMonto: Math.round(fondoGarantiaMonto * 100) / 100,
    netoARecibir: Math.round(netoARecibir * 100) / 100,
  }
}

// Calcula acumulado anterior: SUM(montoValorizacion) de valorizaciones anteriores no anuladas
async function calcularAcumuladoAnterior(proyectoId: string, excludeId?: string): Promise<number> {
  const where: any = {
    proyectoId,
    estado: { not: 'anulada' },
  }
  if (excludeId) {
    where.id = { not: excludeId }
  }

  const agg = await prisma.valorizacion.aggregate({
    where,
    _sum: { montoValorizacion: true },
  })

  return agg._sum.montoValorizacion || 0
}

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true, totalCliente: true, clienteId: true } },
  adjuntos: true,
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await params
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado')

    const where: any = { proyectoId }
    if (estado) where.estado = estado

    const valorizaciones = await prisma.valorizacion.findMany({
      where,
      include: includeRelations,
      orderBy: { numero: 'asc' },
    })

    return NextResponse.json(valorizaciones)
  } catch (error) {
    console.error('Error al listar valorizaciones:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId } = await params
    const body = await req.json()

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, codigo: true, totalCliente: true, clienteId: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Calcular número secuencial
    const ultimaVal = await prisma.valorizacion.findFirst({
      where: { proyectoId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    })
    const numero = (ultimaVal?.numero || 0) + 1
    const codigo = `${proyecto.codigo}-VAL-${String(numero).padStart(3, '0')}`

    // presupuestoContractual: usar totalCliente del proyecto o override manual
    const presupuestoContractual = body.presupuestoContractual ?? proyecto.totalCliente ?? 0

    // Calcular acumulado anterior
    const acumuladoAnterior = await calcularAcumuladoAnterior(proyectoId)

    const montoValorizacion = body.montoValorizacion || 0
    const descuentoComercialPorcentaje = body.descuentoComercialPorcentaje ?? 0
    const adelantoPorcentaje = body.adelantoPorcentaje ?? 0
    const igvPorcentaje = body.igvPorcentaje ?? 18
    const fondoGarantiaPorcentaje = body.fondoGarantiaPorcentaje ?? 0

    const calculados = calcularMontos({
      montoValorizacion,
      acumuladoAnterior,
      presupuestoContractual,
      descuentoComercialPorcentaje,
      adelantoPorcentaje,
      igvPorcentaje,
      fondoGarantiaPorcentaje,
    })

    const valorizacion = await prisma.valorizacion.create({
      data: {
        proyectoId,
        numero,
        codigo,
        periodoInicio: new Date(body.periodoInicio),
        periodoFin: new Date(body.periodoFin),
        moneda: body.moneda || 'PEN',
        tipoCambio: body.tipoCambio || null,
        presupuestoContractual,
        acumuladoAnterior,
        montoValorizacion,
        descuentoComercialPorcentaje,
        adelantoPorcentaje,
        igvPorcentaje,
        fondoGarantiaPorcentaje,
        observaciones: body.observaciones || null,
        ...calculados,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(valorizacion, { status: 201 })
  } catch (error) {
    console.error('Error al crear valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
