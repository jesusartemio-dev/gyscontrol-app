import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularHorasOT, calcularDescuentoVolumen } from '@/lib/utils/otUtils'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (clienteId) where.clienteId = clienteId
    if (estado) where.valorizacion = { estado }

    // If filtering by proyectoId, filter through the valorizacion relation
    if (proyectoId) {
      where.valorizacion = { ...where.valorizacion, proyectoId }
    }

    const items = await prisma.valorizacionHH.findMany({
      where,
      include: {
        valorizacion: {
          select: {
            id: true, estado: true, codigo: true, montoValorizacion: true,
            periodoInicio: true, periodoFin: true, netoARecibir: true, moneda: true,
            proyecto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        cliente: { select: { id: true, nombre: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Parse proyectosIds from JSON string
    const result = items.map(item => ({
      ...item,
      proyectosIds: safeParse(item.proyectosIds),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al listar valorizaciones HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
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
    const {
      proyectoId, clienteId, periodoInicio, periodoFin,
      registroHorasIds,
    } = body
    const proyectosIds: string[] = body.proyectosIds || []
    const moneda = body.moneda || 'USD'
    const descuentoComercialPorcentaje = body.descuentoComercialPorcentaje ?? 0
    const igvPorcentaje = body.igvPorcentaje ?? 18
    const fondoGarantiaPorcentaje = body.fondoGarantiaPorcentaje ?? 0
    const adelantoMontoOverride = body.adelantoMontoOverride

    if (!proyectoId || !clienteId || !periodoInicio || !periodoFin) {
      return NextResponse.json(
        { error: 'proyectoId, clienteId, periodoInicio y periodoFin son requeridos' },
        { status: 400 }
      )
    }
    if (!registroHorasIds || registroHorasIds.length === 0) {
      return NextResponse.json(
        { error: 'registroHorasIds no puede estar vacío' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate all registros exist, are approved, and not already valorized
      const registros = await tx.registroHoras.findMany({
        where: { id: { in: registroHorasIds } },
        include: {
          recurso: { select: { id: true, nombre: true, tipo: true, costoHora: true } },
          proyecto: { select: { id: true, codigo: true, nombre: true, clienteId: true } },
          lineaHH: { select: { id: true } },
        },
      })

      if (registros.length !== registroHorasIds.length) {
        const foundIds = new Set(registros.map(r => r.id))
        const missing = registroHorasIds.filter((id: string) => !foundIds.has(id))
        return { error: `Registros no encontrados: ${missing.join(', ')}`, status: 400 }
      }

      const yaValorizados = registros.filter(r => r.lineaHH !== null)
      if (yaValorizados.length > 0) {
        return {
          error: `${yaValorizados.length} registro(s) ya valorizados: ${yaValorizados.map(r => r.id).slice(0, 5).join(', ')}`,
          status: 400,
        }
      }

      const noAprobados = registros.filter(r => !r.aprobado)
      if (noAprobados.length > 0) {
        return {
          error: `${noAprobados.length} registro(s) no aprobados`,
          status: 400,
        }
      }

      // 2. Load tarifas and discounts
      const tarifasDB = await tx.tarifaClienteRecurso.findMany({
        where: { clienteId, activo: true },
      })
      const tarifasMap = new Map<string, number>()
      for (const t of tarifasDB) {
        tarifasMap.set(`${t.recursoId}_${t.modalidad}`, t.tarifaVenta)
      }

      const descuentosDB = await tx.configDescuentoHH.findMany({
        where: { clienteId, activo: true },
        orderBy: { orden: 'asc' },
      })

      // 3. Calculate all lines server-side
      const lineasCalculadas = registros.map((reg, idx) => {
        const modalidad = reg.origen ?? 'oficina'
        const tarifaKey = `${reg.recursoId}_${modalidad}`
        const tarifaFallback = `${reg.recursoId}_oficina`
        const tarifaHora = tarifasMap.get(tarifaKey)
          ?? tarifasMap.get(tarifaFallback)
          ?? 0

        const ot = calcularHorasOT(new Date(reg.fechaTrabajo), reg.horasTrabajadas)
        const costoLinea = +(ot.horasEquivalente * tarifaHora).toFixed(2)

        return {
          registroHorasId: reg.id,
          proyectoId: reg.proyectoId,
          recursoId: reg.recursoId,
          fecha: reg.fechaTrabajo,
          detalle: reg.descripcion,
          modalidad: modalidad as 'oficina' | 'campo',
          horasReportadas: reg.horasTrabajadas,
          horasStd: ot.horasStd,
          horasOT125: ot.horasOT125,
          horasOT135: ot.horasOT135,
          horasOT200: ot.horasOT200,
          horasEquivalente: ot.horasEquivalente,
          tarifaHora,
          moneda: 'USD',
          costoLinea,
          orden: idx,
        }
      })

      // 4. Calculate HH totals
      const totalHorasReportadas = +lineasCalculadas.reduce((s, l) => s + l.horasReportadas, 0).toFixed(4)
      const totalHorasEquivalentes = +lineasCalculadas.reduce((s, l) => s + l.horasEquivalente, 0).toFixed(4)
      const subtotalHH = +lineasCalculadas.reduce((s, l) => s + l.costoLinea, 0).toFixed(2)

      const descVolumen = calcularDescuentoVolumen(subtotalHH, totalHorasEquivalentes, descuentosDB)
      const montoValorizacion = +(subtotalHH - descVolumen.descuentoMonto).toFixed(2)

      // 5. Load proyecto for adelanto + numero calculation
      const proyecto = await tx.proyecto.findUniqueOrThrow({
        where: { id: proyectoId },
        select: {
          id: true, codigo: true, totalCliente: true,
          adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true,
        },
      })

      const adelanto = calcularAdelantoValorizacion(proyecto, montoValorizacion, adelantoMontoOverride)

      // 6. Calculate financial fields
      const descuentoComercialMonto = +(montoValorizacion * descuentoComercialPorcentaje / 100).toFixed(2)
      const adelantoMonto = adelanto.tieneAdelanto ? adelanto.adelantoMonto : 0
      const adelantoPorcentaje = adelanto.tieneAdelanto ? adelanto.adelantoPorcentaje : 0
      const subtotal = +(montoValorizacion - descuentoComercialMonto - adelantoMonto).toFixed(2)
      const igvMonto = +(subtotal * igvPorcentaje / 100).toFixed(2)
      const fondoGarantiaMonto = +(subtotal * fondoGarantiaPorcentaje / 100).toFixed(2)
      const netoARecibir = +(subtotal + igvMonto - fondoGarantiaMonto).toFixed(2)

      // Acumulado anterior
      const aggPrev = await tx.valorizacion.aggregate({
        where: {
          proyectoId,
          estado: { not: 'anulada' },
        },
        _sum: { montoValorizacion: true },
      })
      const acumuladoAnterior = aggPrev._sum.montoValorizacion || 0
      const presupuestoContractual = proyecto.totalCliente ?? 0
      const acumuladoActual = +(acumuladoAnterior + montoValorizacion).toFixed(2)
      const saldoPorValorizar = +(presupuestoContractual - acumuladoActual).toFixed(2)
      const porcentajeAvance = presupuestoContractual > 0
        ? +((acumuladoActual / presupuestoContractual) * 100).toFixed(2)
        : 0

      // 7. Generate numero/codigo
      const ultimaVal = await tx.valorizacion.findFirst({
        where: { proyectoId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const numero = (ultimaVal?.numero || 0) + 1
      const codigo = `${proyecto.codigo}-VAL-${String(numero).padStart(3, '0')}`

      // 8. Create Valorizacion
      const valorizacion = await tx.valorizacion.create({
        data: {
          proyectoId,
          numero,
          codigo,
          periodoInicio: new Date(periodoInicio),
          periodoFin: new Date(periodoFin),
          moneda,
          presupuestoContractual,
          acumuladoAnterior,
          montoValorizacion,
          acumuladoActual,
          saldoPorValorizar,
          porcentajeAvance,
          descuentoComercialPorcentaje,
          descuentoComercialMonto,
          adelantoPorcentaje,
          adelantoMonto,
          subtotal,
          igvPorcentaje,
          igvMonto,
          fondoGarantiaPorcentaje,
          fondoGarantiaMonto,
          netoARecibir,
          updatedAt: new Date(),
        },
      })

      // 9. Create ValorizacionHH
      const valHH = await tx.valorizacionHH.create({
        data: {
          valorizacionId: valorizacion.id,
          clienteId,
          periodoInicio: new Date(periodoInicio),
          periodoFin: new Date(periodoFin),
          proyectosIds: JSON.stringify(proyectosIds),
          totalHorasReportadas,
          totalHorasEquivalentes,
          subtotal: subtotalHH,
          descuentoPct: descVolumen.descuentoPct,
          descuentoMonto: descVolumen.descuentoMonto,
        },
      })

      // 10. Create LineaHH[]
      await tx.lineaHH.createMany({
        data: lineasCalculadas.map(l => ({
          valorizacionHHId: valHH.id,
          registroHorasId: l.registroHorasId,
          proyectoId: l.proyectoId,
          recursoId: l.recursoId,
          fecha: l.fecha,
          detalle: l.detalle,
          modalidad: l.modalidad,
          horasReportadas: l.horasReportadas,
          horasStd: l.horasStd,
          horasOT125: l.horasOT125,
          horasOT135: l.horasOT135,
          horasOT200: l.horasOT200,
          horasEquivalente: l.horasEquivalente,
          tarifaHora: l.tarifaHora,
          moneda: l.moneda,
          costoLinea: l.costoLinea,
          orden: l.orden,
        })),
      })

      // 11. Return full valorizacion
      return tx.valorizacion.findUniqueOrThrow({
        where: { id: valorizacion.id },
        include: {
          valorizacionHH: {
            include: {
              lineas: { orderBy: { orden: 'asc' } },
              cliente: { select: { id: true, nombre: true } },
            },
          },
          proyecto: { select: { id: true, codigo: true, nombre: true } },
        },
      })
    })

    // Handle validation errors from inside transaction
    if ('error' in result && 'status' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status as number })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error al crear valorización HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

function safeParse(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}
