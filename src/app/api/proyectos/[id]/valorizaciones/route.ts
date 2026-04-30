import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'
import { calcularMontos, calcularAcumuladoAnterior } from '@/lib/utils/valorizacionAcumulado'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true, totalCliente: true, clienteId: true, adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true } },
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
      select: {
        id: true, codigo: true, totalCliente: true, clienteId: true,
        adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true,
        fondoGarantiaPct: true, descuentoComercialPct: true, igvPct: true,
      },
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

    // Acumulado anterior = SUM(montoValorizacion) de las valorizaciones del proyecto
    // con numero < numero de la nueva (excluyendo anuladas).
    const acumuladoAnterior = await calcularAcumuladoAnterior(prisma, proyectoId, numero)

    const montoValorizacion = body.montoValorizacion || 0
    const descuentoComercialPorcentaje = body.descuentoComercialPorcentaje ?? proyecto.descuentoComercialPct ?? 0
    const igvPorcentaje = body.igvPorcentaje ?? proyecto.igvPct ?? 18
    const fondoGarantiaPorcentaje = body.fondoGarantiaPorcentaje ?? proyecto.fondoGarantiaPct ?? 0

    // Auto-calcular adelanto desde proyecto si tiene adelanto configurado
    const adelantoCalc = calcularAdelantoValorizacion(proyecto, montoValorizacion)
    const adelantoPorcentaje = adelantoCalc.tieneAdelanto ? adelantoCalc.adelantoPorcentaje : (body.adelantoPorcentaje ?? 0)

    const calculados = calcularMontos({
      montoValorizacion,
      acumuladoAnterior,
      presupuestoContractual,
      descuentoComercialPorcentaje,
      adelantoPorcentaje,
      igvPorcentaje,
      fondoGarantiaPorcentaje,
    })

    // Si el proyecto tiene adelanto, usar el monto calculado por el helper
    if (adelantoCalc.tieneAdelanto) {
      calculados.adelantoMonto = adelantoCalc.adelantoMonto
    }

    // Buscar la última valorización no anulada del proyecto para copiar sus partidas
    const ultimaValNoAnulada = await prisma.valorizacion.findFirst({
      where: { proyectoId, estado: { not: 'anulada' } },
      orderBy: { numero: 'desc' },
      select: { id: true },
    })

    const valorizacion = await prisma.$transaction(async (tx) => {
      const val = await tx.valorizacion.create({
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
          // Condiciones de pago de esta valorización
          condicionPago: body.condicionPago || null,
          formaPago: body.formaPago || null,
          diasCredito: body.diasCredito ?? null,
          notasPago: body.notasPago || null,
          ...calculados,
          updatedAt: new Date(),
        },
        include: includeRelations,
      })

      // Pre-cargar partidas de la valorización anterior (con % avance reseteado a 0)
      if (ultimaValNoAnulada) {
        const partidasAnteriores = await tx.partidaValorizacion.findMany({
          where: { valorizacionId: ultimaValNoAnulada.id },
          orderBy: { orden: 'asc' },
        })

        if (partidasAnteriores.length > 0) {
          await tx.partidaValorizacion.createMany({
            data: partidasAnteriores.map((p, idx) => ({
              valorizacionId: val.id,
              numero: idx + 1,
              descripcion: p.descripcion,
              origen: p.origen,
              proyectoEquipoCotizadoId: p.proyectoEquipoCotizadoId,
              proyectoServicioCotizadoId: p.proyectoServicioCotizadoId,
              proyectoGastoCotizadoId: p.proyectoGastoCotizadoId,
              proyectoEdtId: p.proyectoEdtId,
              partidaOrigenId: p.partidaOrigenId || p.id,
              montoContractual: p.montoContractual,
              porcentajeAvance: 0,
              montoAvance: 0,
              orden: idx + 1,
            })),
          })
        }
      }

      return val
    })

    return NextResponse.json(valorizacion, { status: 201 })
  } catch (error) {
    console.error('Error al crear valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
