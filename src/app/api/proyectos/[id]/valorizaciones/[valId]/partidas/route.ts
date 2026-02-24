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

// Recalcula montoValorizacion = SUM(partidas.montoAvance) y todos los campos derivados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcularMontoValorizacion(valorizacionId: string, tx: any) {
  const partidas = await tx.partidaValorizacion.findMany({
    where: { valorizacionId },
  })

  const montoValorizacion = Math.round(
    partidas.reduce((sum: number, p: any) => sum + p.montoAvance, 0) * 100
  ) / 100

  const val = await tx.valorizacion.findUnique({
    where: { id: valorizacionId },
  })
  if (!val) return null

  // Calcular acumulado anterior (SUM de otras valorizaciones no anuladas del mismo proyecto)
  const agg = await tx.valorizacion.aggregate({
    where: {
      proyectoId: val.proyectoId,
      estado: { not: 'anulada' },
      id: { not: valorizacionId },
    },
    _sum: { montoValorizacion: true },
  })
  const acumuladoAnterior = agg._sum.montoValorizacion || 0

  const calculados = calcularMontos({
    montoValorizacion,
    acumuladoAnterior,
    presupuestoContractual: val.presupuestoContractual,
    descuentoComercialPorcentaje: val.descuentoComercialPorcentaje,
    adelantoPorcentaje: val.adelantoPorcentaje,
    igvPorcentaje: val.igvPorcentaje,
    fondoGarantiaPorcentaje: val.fondoGarantiaPorcentaje,
  })

  return tx.valorizacion.update({
    where: { id: valorizacionId },
    data: {
      montoValorizacion,
      acumuladoAnterior,
      ...calculados,
      updatedAt: new Date(),
    },
  })
}

// GET /api/proyectos/[id]/valorizaciones/[valId]/partidas
export async function GET(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, valId } = await params

    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
      select: { id: true, proyectoId: true, periodoInicio: true },
    })
    if (!valorizacion || valorizacion.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    const partidas = await prisma.partidaValorizacion.findMany({
      where: { valorizacionId: valId },
      orderBy: { orden: 'asc' },
    })

    // Buscar valorizaciones anteriores aprobadas del mismo proyecto
    const valorizacionesAnteriores = await prisma.valorizacion.findMany({
      where: {
        proyectoId,
        estado: { in: ['aprobada_cliente', 'facturada', 'pagada'] },
        periodoFin: { lt: valorizacion.periodoInicio },
      },
      select: { id: true },
    })
    const idsAnteriores = valorizacionesAnteriores.map(v => v.id)

    // Buscar partidas de valorizaciones anteriores para calcular acumulados
    let partidasAnteriores: typeof partidas = []
    if (idsAnteriores.length > 0) {
      partidasAnteriores = await prisma.partidaValorizacion.findMany({
        where: { valorizacionId: { in: idsAnteriores } },
      })
    }

    // Calcular acumulados dinámicamente para cada partida
    const partidasConAcumulados = partidas.map(partida => {
      // Buscar partidas anteriores que matcheen por FK (en orden de prioridad)
      const anterioresMatch = partidasAnteriores.filter(pa => {
        if (partida.proyectoEdtId && pa.proyectoEdtId === partida.proyectoEdtId) return true
        if (partida.proyectoServicioCotizadoId && pa.proyectoServicioCotizadoId === partida.proyectoServicioCotizadoId) return true
        if (partida.proyectoEquipoCotizadoId && pa.proyectoEquipoCotizadoId === partida.proyectoEquipoCotizadoId) return true
        if (partida.proyectoGastoCotizadoId && pa.proyectoGastoCotizadoId === partida.proyectoGastoCotizadoId) return true
        return false
      })

      const porcentajeAcumuladoAnterior = Math.round(
        anterioresMatch.reduce((sum, pa) => sum + pa.porcentajeAvance, 0) * 100
      ) / 100
      const montoAcumuladoAnterior = Math.round(
        anterioresMatch.reduce((sum, pa) => sum + pa.montoAvance, 0) * 100
      ) / 100

      return {
        ...partida,
        porcentajeAcumuladoAnterior,
        montoAcumuladoAnterior,
      }
    })

    // Resumen
    const totalContractual = Math.round(
      partidas.reduce((sum, p) => sum + p.montoContractual, 0) * 100
    ) / 100
    const totalAvance = Math.round(
      partidas.reduce((sum: number, p: any) => sum + p.montoAvance, 0) * 100
    ) / 100
    const porcentajePromedioAvance = totalContractual > 0
      ? Math.round((totalAvance / totalContractual) * 100 * 100) / 100
      : 0

    return NextResponse.json({
      partidas: partidasConAcumulados,
      resumen: {
        totalContractual,
        totalAvance,
        porcentajePromedioAvance,
      },
    })
  } catch (error) {
    console.error('Error al listar partidas de valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/proyectos/[id]/valorizaciones/[valId]/partidas
export async function POST(req: Request, { params }: { params: Promise<{ id: string; valId: string }> }) {
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

    // Validar valorización existe y pertenece al proyecto
    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
    })
    if (!valorizacion || valorizacion.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    // Solo se pueden agregar partidas en estado borrador
    if (valorizacion.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden agregar partidas a valorizaciones en estado borrador' },
        { status: 400 }
      )
    }

    // Validar campos requeridos
    if (!body.numero || !body.descripcion || body.montoContractual === undefined || body.porcentajeAvance === undefined) {
      return NextResponse.json(
        { error: 'Campos requeridos: numero, descripcion, montoContractual, porcentajeAvance' },
        { status: 400 }
      )
    }

    const montoContractual = body.montoContractual
    const porcentajeAvance = body.porcentajeAvance
    const montoAvance = Math.round(montoContractual * (porcentajeAvance / 100) * 100) / 100

    // Si no viene orden, asignar max + 1
    let orden = body.orden
    if (orden === undefined || orden === null) {
      const maxOrden = await prisma.partidaValorizacion.findFirst({
        where: { valorizacionId: valId },
        orderBy: { orden: 'desc' },
        select: { orden: true },
      })
      orden = (maxOrden?.orden ?? 0) + 1
    }

    const result = await prisma.$transaction(async (tx) => {
      const partida = await tx.partidaValorizacion.create({
        data: {
          valorizacionId: valId,
          numero: body.numero,
          descripcion: body.descripcion,
          origen: body.origen || 'libre',
          proyectoEquipoCotizadoId: body.proyectoEquipoCotizadoId || null,
          proyectoServicioCotizadoId: body.proyectoServicioCotizadoId || null,
          proyectoGastoCotizadoId: body.proyectoGastoCotizadoId || null,
          proyectoEdtId: body.proyectoEdtId || null,
          montoContractual,
          porcentajeAvance,
          montoAvance,
          orden,
        },
      })

      const valActualizada = await recalcularMontoValorizacion(valId, tx)

      return { partida, montoValorizacion: valActualizada?.montoValorizacion ?? 0 }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error al crear partida de valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT /api/proyectos/[id]/valorizaciones/[valId]/partidas
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

    const valorizacion = await prisma.valorizacion.findUnique({
      where: { id: valId },
    })
    if (!valorizacion || valorizacion.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Valorización no encontrada' }, { status: 404 })
    }

    if (valorizacion.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden modificar partidas de valorizaciones en estado borrador' },
        { status: 400 }
      )
    }

    const partidasInput = body.partidas
    if (!Array.isArray(partidasInput) || partidasInput.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de partidas' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Eliminar partidas existentes
      await tx.partidaValorizacion.deleteMany({
        where: { valorizacionId: valId },
      })

      // Crear todas las partidas nuevas
      const partidasData = partidasInput.map((p: any, index: number) => {
        const montoContractual = p.montoContractual || 0
        const porcentajeAvance = p.porcentajeAvance || 0
        const montoAvance = Math.round(montoContractual * (porcentajeAvance / 100) * 100) / 100

        return {
          valorizacionId: valId,
          numero: p.numero,
          descripcion: p.descripcion,
          origen: p.origen || 'libre',
          proyectoEquipoCotizadoId: p.proyectoEquipoCotizadoId || null,
          proyectoServicioCotizadoId: p.proyectoServicioCotizadoId || null,
          proyectoGastoCotizadoId: p.proyectoGastoCotizadoId || null,
          proyectoEdtId: p.proyectoEdtId || null,
          montoContractual,
          porcentajeAvance,
          montoAvance,
          orden: p.orden ?? index + 1,
        }
      })

      await tx.partidaValorizacion.createMany({ data: partidasData })

      const partidas = await tx.partidaValorizacion.findMany({
        where: { valorizacionId: valId },
        orderBy: { orden: 'asc' },
      })

      const valActualizada = await recalcularMontoValorizacion(valId, tx)

      return { partidas, montoValorizacion: valActualizada?.montoValorizacion ?? 0 }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al actualizar partidas de valorización:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
