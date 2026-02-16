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

interface ImportRegistro {
  proyectoId: string
  numero: number
  periodoInicio: string
  periodoFin: string
  montoValorizacion: number
  moneda: string
  tipoCambio: number | null
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
  estado: string
  observaciones: string | null
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { registros } = body as { registros: ImportRegistro[] }

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ error: 'No hay registros para importar' }, { status: 400 })
    }

    if (registros.length > 200) {
      return NextResponse.json({ error: 'Máximo 200 registros por importación' }, { status: 400 })
    }

    // Group by proyectoId and sort by numero within each group
    const porProyecto = new Map<string, ImportRegistro[]>()
    for (const r of registros) {
      const list = porProyecto.get(r.proyectoId) || []
      list.push(r)
      porProyecto.set(r.proyectoId, list)
    }

    // Sort each project's records by numero
    for (const [, list] of porProyecto) {
      list.sort((a, b) => a.numero - b.numero)
    }

    let creados = 0
    const errores: string[] = []

    for (const [proyectoId, regs] of porProyecto) {
      // Get project data
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { id: true, codigo: true, totalCliente: true },
      })
      if (!proyecto) {
        errores.push(`Proyecto ${proyectoId} no encontrado`)
        continue
      }

      const presupuestoContractual = proyecto.totalCliente ?? 0

      // Get existing acumulado (SUM of non-anulada valorizaciones)
      const existingAgg = await prisma.valorizacion.aggregate({
        where: {
          proyectoId,
          estado: { not: 'anulada' },
        },
        _sum: { montoValorizacion: true },
      })
      let acumuladoRunning = existingAgg._sum.montoValorizacion || 0

      // Get last numero for this project
      const ultimaVal = await prisma.valorizacion.findFirst({
        where: { proyectoId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      let ultimoNumero = ultimaVal?.numero || 0

      for (const r of regs) {
        try {
          if (!r.montoValorizacion || r.montoValorizacion <= 0) {
            errores.push(`Proyecto ${proyecto.codigo} N°${r.numero}: monto inválido`)
            continue
          }

          // Check if numero already exists for this project
          const existente = await prisma.valorizacion.findUnique({
            where: { proyectoId_numero: { proyectoId, numero: r.numero } },
          })
          if (existente) {
            errores.push(`Proyecto ${proyecto.codigo} N°${r.numero}: ya existe`)
            continue
          }

          const numero = r.numero
          ultimoNumero = Math.max(ultimoNumero, numero)
          const codigo = `${proyecto.codigo}-VAL-${String(numero).padStart(3, '0')}`

          // For acumulado: use running total for non-anulada, or 0 for anulada
          const acumuladoAnterior = r.estado === 'anulada' ? 0 : acumuladoRunning

          const calculados = calcularMontos({
            montoValorizacion: r.montoValorizacion,
            acumuladoAnterior,
            presupuestoContractual,
            descuentoComercialPorcentaje: r.descuentoComercialPorcentaje ?? 0,
            adelantoPorcentaje: r.adelantoPorcentaje ?? 0,
            igvPorcentaje: r.igvPorcentaje ?? 18,
            fondoGarantiaPorcentaje: r.fondoGarantiaPorcentaje ?? 0,
          })

          await prisma.valorizacion.create({
            data: {
              proyectoId,
              numero,
              codigo,
              periodoInicio: new Date(r.periodoInicio),
              periodoFin: new Date(r.periodoFin),
              moneda: r.moneda || 'USD',
              tipoCambio: r.tipoCambio || null,
              presupuestoContractual,
              acumuladoAnterior,
              montoValorizacion: r.montoValorizacion,
              descuentoComercialPorcentaje: r.descuentoComercialPorcentaje ?? 0,
              adelantoPorcentaje: r.adelantoPorcentaje ?? 0,
              igvPorcentaje: r.igvPorcentaje ?? 18,
              fondoGarantiaPorcentaje: r.fondoGarantiaPorcentaje ?? 0,
              estado: (r.estado || 'borrador') as any,
              observaciones: r.observaciones || null,
              ...calculados,
              updatedAt: new Date(),
            },
          })

          // Only add to running acumulado if not anulada
          if (r.estado !== 'anulada') {
            acumuladoRunning += r.montoValorizacion
          }

          creados++
        } catch (err: any) {
          errores.push(`Proyecto ${proyecto.codigo} N°${r.numero}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({
      creados,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('Error al importar valorizaciones:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
