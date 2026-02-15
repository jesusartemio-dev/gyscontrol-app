import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

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

async function calcularAcumuladoAnterior(proyectoId: string, excludeId: string): Promise<number> {
  const agg = await prisma.valorizacion.aggregate({
    where: {
      proyectoId,
      estado: { not: 'anulada' },
      id: { not: excludeId },
    },
    _sum: { montoValorizacion: true },
  })
  return agg._sum.montoValorizacion || 0
}

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true, totalCliente: true, clienteId: true } },
  adjuntos: true,
  cuentasPorCobrar: true,
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { valId } = await params
    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
      include: includeRelations,
    })
    if (!valorizacion) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    return NextResponse.json(valorizacion)
  } catch (error) {
    console.error('Error al obtener valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId, valId } = await params
    const body = await req.json()

    const existing = await prisma.valorizacion.findUnique({ where: { id: valId } })
    if (!existing) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    // Manejo de cambio de estado
    if (body.estado && body.estado !== existing.estado) {
      // Transición a "facturada": opcionalmente crear CuentaPorCobrar
      if (body.estado === 'facturada' && body.crearCuentaCobrar) {
        const proyecto = await prisma.proyecto.findUnique({
          where: { id: proyectoId },
          select: { clienteId: true },
        })
        if (proyecto) {
          await prisma.cuentaPorCobrar.create({
            data: {
              proyectoId,
              clienteId: proyecto.clienteId,
              valorizacionId: valId,
              numeroDocumento: body.numeroDocumento || null,
              descripcion: `Valorización ${existing.codigo}`,
              monto: existing.netoARecibir,
              moneda: existing.moneda,
              tipoCambio: existing.tipoCambio,
              saldoPendiente: existing.netoARecibir,
              fechaEmision: new Date(),
              fechaVencimiento: body.fechaVencimiento
                ? new Date(body.fechaVencimiento)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días default
              updatedAt: new Date(),
            },
          })
        }
      }
    }

    // Recalcular si cambian montos
    const montoValorizacion = body.montoValorizacion ?? existing.montoValorizacion
    const presupuestoContractual = body.presupuestoContractual ?? existing.presupuestoContractual
    const descuentoComercialPorcentaje = body.descuentoComercialPorcentaje ?? existing.descuentoComercialPorcentaje
    const adelantoPorcentaje = body.adelantoPorcentaje ?? existing.adelantoPorcentaje
    const igvPorcentaje = body.igvPorcentaje ?? existing.igvPorcentaje
    const fondoGarantiaPorcentaje = body.fondoGarantiaPorcentaje ?? existing.fondoGarantiaPorcentaje

    const acumuladoAnterior = await calcularAcumuladoAnterior(proyectoId, valId)
    const calculados = calcularMontos({
      montoValorizacion,
      acumuladoAnterior,
      presupuestoContractual,
      descuentoComercialPorcentaje,
      adelantoPorcentaje,
      igvPorcentaje,
      fondoGarantiaPorcentaje,
    })

    const valorizacion = await prisma.valorizacion.update({
      where: { id: valId },
      data: {
        ...(body.periodoInicio && { periodoInicio: new Date(body.periodoInicio) }),
        ...(body.periodoFin && { periodoFin: new Date(body.periodoFin) }),
        ...(body.moneda !== undefined && { moneda: body.moneda }),
        ...(body.tipoCambio !== undefined && { tipoCambio: body.tipoCambio }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.estado === 'enviada' && !existing.fechaEnvio && { fechaEnvio: new Date() }),
        ...(body.estado === 'aprobada_cliente' && !existing.fechaAprobacion && { fechaAprobacion: new Date() }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        presupuestoContractual,
        montoValorizacion,
        acumuladoAnterior,
        descuentoComercialPorcentaje,
        adelantoPorcentaje,
        igvPorcentaje,
        fondoGarantiaPorcentaje,
        ...calculados,
        updatedAt: new Date(),
      },
      include: includeRelations,
    })

    return NextResponse.json(valorizacion)
  } catch (error) {
    console.error('Error al actualizar valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
