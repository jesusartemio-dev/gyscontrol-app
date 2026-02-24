import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  buildWeekBuckets,
  distributeTaskCostByWeek,
  placeValorizacionInWeek,
  accumulateBuckets,
  calculateEVM,
  type CurvaSResult,
} from '@/lib/utils/curvaS'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    // ─── A: Cargar proyecto ───
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        cotizacionId: true,
        fechaInicio: true,
        fechaFin: true,
        grandTotal: true,
        totalCliente: true,
      },
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (!proyecto.cotizacionId) {
      return NextResponse.json(
        { error: 'Este proyecto no tiene cotización. La Curva S solo aplica a proyectos con cotización.' },
        { status: 400 }
      )
    }

    const bac = proyecto.grandTotal ?? proyecto.totalCliente ?? 0
    const proyectoInfo = { id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre }

    // ─── B: Cargar cronograma ───
    let cronograma = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, esBaseline: true },
    })
    const hasBaseline = !!cronograma

    if (!cronograma) {
      cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId: id },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!cronograma) {
      // Sin cronograma — retornar solo EV si hay valorizaciones
      const valorizaciones = await prisma.valorizacion.findMany({
        where: {
          proyectoId: id,
          estado: { in: ['aprobada_cliente', 'facturada', 'pagada'] },
        },
        select: { periodoFin: true, montoValorizacion: true },
        orderBy: { periodoFin: 'asc' },
      })

      if (valorizaciones.length === 0) {
        return NextResponse.json({
          weeks: [],
          bac,
          evm: { spi: null, sv: 0, cpi: null, cv: null, pvTotal: 0, evTotal: 0, bac },
          hasBaseline: false,
          cronogramaId: null,
          proyecto: proyectoInfo,
        } satisfies CurvaSResult)
      }

      // Build weeks from val range only
      const valDates = valorizaciones.map(v => v.periodoFin)
      const rangeStart = new Date(Math.min(...valDates.map(d => d.getTime())))
      const rangeEnd = new Date(Math.max(...valDates.map(d => d.getTime())))
      if (rangeStart.getTime() === rangeEnd.getTime()) {
        rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6)
      }

      const buckets = buildWeekBuckets(rangeStart, rangeEnd)
      for (const v of valorizaciones) {
        placeValorizacionInWeek({ periodoFin: v.periodoFin, monto: v.montoValorizacion }, buckets)
      }
      accumulateBuckets(buckets)
      const evm = calculateEVM(buckets, bac)

      return NextResponse.json({
        weeks: buckets,
        bac,
        evm,
        hasBaseline: false,
        cronogramaId: null,
        proyecto: proyectoInfo,
      } satisfies CurvaSResult)
    }

    // ─── C: Cargar tareas con recurso ───
    // Patrón EXACTO de costo-planificado/route.ts
    const tareas = await prisma.proyectoTarea.findMany({
      where: {
        proyectoCronogramaId: cronograma.id,
        recursoId: { not: null },
      },
      select: {
        fechaInicio: true,
        fechaFin: true,
        horasEstimadas: true,
        personasEstimadas: true,
        recurso: {
          select: { tipo: true, costoHoraProyecto: true, costoHora: true },
        },
      },
    })

    // Calcular costo por tarea (mismo patrón que costo-planificado)
    const tareasConCosto = tareas
      .filter(t => t.fechaInicio && t.fechaFin)
      .map(t => {
        const horas = Number(t.horasEstimadas) || 0
        const costoHora = t.recurso?.costoHoraProyecto ?? t.recurso?.costoHora ?? 0
        const multiplicador = t.recurso?.tipo === 'cuadrilla' ? 1 : (t.personasEstimadas || 1)
        const costo = horas * multiplicador * costoHora

        return {
          fechaInicio: t.fechaInicio!,
          fechaFin: t.fechaFin!,
          costo,
        }
      })

    // ─── D: Cargar valorizaciones aprobadas ───
    const valorizaciones = await prisma.valorizacion.findMany({
      where: {
        proyectoId: id,
        estado: { in: ['aprobada_cliente', 'facturada', 'pagada'] },
      },
      select: { periodoFin: true, montoValorizacion: true },
      orderBy: { periodoFin: 'asc' },
    })

    // ─── E: Determinar rango temporal ───
    const allDates: Date[] = [
      proyecto.fechaInicio,
      ...(proyecto.fechaFin ? [proyecto.fechaFin] : []),
      ...tareasConCosto.map(t => t.fechaInicio),
      ...tareasConCosto.map(t => t.fechaFin),
      ...valorizaciones.map(v => v.periodoFin),
    ].filter(Boolean) as Date[]

    if (allDates.length === 0) {
      return NextResponse.json({
        weeks: [],
        bac,
        evm: { spi: null, sv: 0, cpi: null, cv: null, pvTotal: 0, evTotal: 0, bac },
        hasBaseline,
        cronogramaId: cronograma.id,
        proyecto: proyectoInfo,
      } satisfies CurvaSResult)
    }

    let rangeStart = new Date(Math.min(...allDates.map(d => d.getTime())))
    let rangeEnd = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Si rangeStart === rangeEnd (proyecto de un solo día): extender
    if (rangeStart.getTime() === rangeEnd.getTime()) {
      rangeEnd = new Date(rangeEnd.getTime())
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6)
    }

    // ─── F: Calcular ───
    const buckets = buildWeekBuckets(rangeStart, rangeEnd)

    for (const t of tareasConCosto) {
      distributeTaskCostByWeek(t, buckets)
    }

    for (const v of valorizaciones) {
      placeValorizacionInWeek({ periodoFin: v.periodoFin, monto: v.montoValorizacion }, buckets)
    }

    accumulateBuckets(buckets)
    const evm = calculateEVM(buckets, bac)

    // ─── G: Retornar ───
    return NextResponse.json({
      weeks: buckets,
      bac,
      evm,
      hasBaseline,
      cronogramaId: cronograma.id,
      proyecto: proyectoInfo,
    } satisfies CurvaSResult)

  } catch (error) {
    console.error('Error al generar Curva S:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
