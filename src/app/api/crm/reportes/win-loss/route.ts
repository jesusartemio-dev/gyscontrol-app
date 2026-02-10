import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface OportunidadConRelaciones {
  id: string
  nombre: string
  estado: string
  valorEstimado: number | null
  probabilidad: number
  prioridad: string
  fuente: string | null
  motivoPerdida: string | null
  competidorGanador: string | null
  createdAt: Date
  updatedAt: Date
  cliente: { nombre: string; codigo: string; sector: string | null } | null
  comercial: { id: string; name: string | null } | null
}

interface GrupoStats {
  key: string
  ganadas: number
  perdidas: number
  winRate: number
  valorGanado: number
  valorPerdido: number
}

// ---------------------------------------------------------------------------
// Helper: agrupar ganadas y perdidas por una dimensión
// ---------------------------------------------------------------------------

function groupByDimension(
  ganadas: OportunidadConRelaciones[],
  perdidas: OportunidadConRelaciones[],
  keyFn: (o: OportunidadConRelaciones) => string
): GrupoStats[] {
  const map = new Map<string, { ganadas: number; perdidas: number; valorGanado: number; valorPerdido: number }>()

  for (const o of ganadas) {
    const key = keyFn(o)
    const entry = map.get(key) || { ganadas: 0, perdidas: 0, valorGanado: 0, valorPerdido: 0 }
    entry.ganadas += 1
    entry.valorGanado += o.valorEstimado ?? 0
    map.set(key, entry)
  }

  for (const o of perdidas) {
    const key = keyFn(o)
    const entry = map.get(key) || { ganadas: 0, perdidas: 0, valorGanado: 0, valorPerdido: 0 }
    entry.perdidas += 1
    entry.valorPerdido += o.valorEstimado ?? 0
    map.set(key, entry)
  }

  return Array.from(map.entries()).map(([key, v]) => {
    const total = v.ganadas + v.perdidas
    return {
      key,
      ganadas: v.ganadas,
      perdidas: v.perdidas,
      winRate: total > 0 ? Math.round((v.ganadas / total) * 10000) / 100 : 0,
      valorGanado: v.valorGanado,
      valorPerdido: v.valorPerdido,
    }
  })
}

// ---------------------------------------------------------------------------
// Helper: calcular promedio de días entre createdAt y updatedAt
// ---------------------------------------------------------------------------

function avgDaysToClose(list: OportunidadConRelaciones[]): number {
  if (list.length === 0) return 0
  const totalDays = list.reduce((sum, o) => {
    const diff = o.updatedAt.getTime() - o.createdAt.getTime()
    return sum + diff / (1000 * 60 * 60 * 24)
  }, 0)
  return Math.round((totalDays / list.length) * 10) / 10
}

// ---------------------------------------------------------------------------
// Helper: clasificar valor en rangos
// ---------------------------------------------------------------------------

function getValueRange(valor: number | null): string {
  const v = valor ?? 0
  if (v < 10000) return '$0 - $10K'
  if (v < 50000) return '$10K - $50K'
  if (v < 100000) return '$50K - $100K'
  return '$100K+'
}

// ---------------------------------------------------------------------------
// GET /api/crm/reportes/win-loss
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parámetros de fecha
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultDesde = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const fechaDesde = searchParams.get('fechaDesde')
      ? new Date(searchParams.get('fechaDesde')!)
      : defaultDesde
    const fechaHasta = searchParams.get('fechaHasta')
      ? new Date(searchParams.get('fechaHasta')!)
      : now

    // Campos de selección comunes
    const selectFields = {
      id: true,
      nombre: true,
      estado: true,
      valorEstimado: true,
      probabilidad: true,
      prioridad: true,
      fuente: true,
      motivoPerdida: true,
      competidorGanador: true,
      createdAt: true,
      updatedAt: true,
      cliente: { select: { nombre: true, codigo: true, sector: true } },
      comercial: { select: { id: true, name: true } },
    } as const

    // Consultar oportunidades ganadas
    const ganadas = (await prisma.crmOportunidad.findMany({
      where: {
        estado: { in: ['seguimiento_proyecto', 'cerrada_ganada'] },
        updatedAt: { gte: fechaDesde, lte: fechaHasta },
      },
      select: selectFields,
    })) as unknown as OportunidadConRelaciones[]

    // Consultar oportunidades perdidas
    const perdidas = (await prisma.crmOportunidad.findMany({
      where: {
        estado: { in: ['feedback_mejora', 'cerrada_perdida'] },
        updatedAt: { gte: fechaDesde, lte: fechaHasta },
      },
      select: selectFields,
    })) as unknown as OportunidadConRelaciones[]

    // -----------------------------------------------------------------------
    // 1. Resumen
    // -----------------------------------------------------------------------
    const winCount = ganadas.length
    const lossCount = perdidas.length
    const total = winCount + lossCount
    const winRate = total > 0 ? Math.round((winCount / total) * 10000) / 100 : 0

    const avgDealSizeWon =
      winCount > 0
        ? Math.round(ganadas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0) / winCount)
        : 0
    const avgDealSizeLost =
      lossCount > 0
        ? Math.round(perdidas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0) / lossCount)
        : 0

    const avgTimeToCloseWon = avgDaysToClose(ganadas)
    const avgTimeToCloseLost = avgDaysToClose(perdidas)

    const resumen = {
      winCount,
      lossCount,
      winRate,
      avgDealSizeWon,
      avgDealSizeLost,
      avgTimeToCloseWon,
      avgTimeToCloseLost,
    }

    // -----------------------------------------------------------------------
    // 2. Por Sector
    // -----------------------------------------------------------------------
    const porSector = groupByDimension(
      ganadas,
      perdidas,
      (o) => o.cliente?.sector || 'No especificado'
    ).map((g) => ({
      sector: g.key,
      ganadas: g.ganadas,
      perdidas: g.perdidas,
      winRate: g.winRate,
      valorGanado: g.valorGanado,
      valorPerdido: g.valorPerdido,
    }))

    // -----------------------------------------------------------------------
    // 3. Por Comercial
    // -----------------------------------------------------------------------
    const porComercial = groupByDimension(
      ganadas,
      perdidas,
      (o) => o.comercial?.name || 'No asignado'
    ).map((g) => {
      // Buscar el ID del comercial
      const match = [...ganadas, ...perdidas].find(
        (o) => (o.comercial?.name || 'No asignado') === g.key
      )
      return {
        comercialId: match?.comercial?.id || null,
        nombre: g.key,
        ganadas: g.ganadas,
        perdidas: g.perdidas,
        winRate: g.winRate,
        valorGanado: g.valorGanado,
      }
    })

    // -----------------------------------------------------------------------
    // 4. Por Fuente
    // -----------------------------------------------------------------------
    const porFuente = groupByDimension(
      ganadas,
      perdidas,
      (o) => o.fuente || 'No especificado'
    ).map((g) => ({
      fuente: g.key,
      ganadas: g.ganadas,
      perdidas: g.perdidas,
      winRate: g.winRate,
    }))

    // -----------------------------------------------------------------------
    // 5. Por Prioridad
    // -----------------------------------------------------------------------
    const porPrioridad = groupByDimension(
      ganadas,
      perdidas,
      (o) => o.prioridad || 'No especificado'
    ).map((g) => ({
      prioridad: g.key,
      ganadas: g.ganadas,
      perdidas: g.perdidas,
      winRate: g.winRate,
    }))

    // -----------------------------------------------------------------------
    // 6. Por Rango de Valor
    // -----------------------------------------------------------------------
    const rangoOrder = ['$0 - $10K', '$10K - $50K', '$50K - $100K', '$100K+']
    const porRangoValor = groupByDimension(
      ganadas,
      perdidas,
      (o) => getValueRange(o.valorEstimado)
    )
      .map((g) => ({
        rango: g.key,
        ganadas: g.ganadas,
        perdidas: g.perdidas,
        winRate: g.winRate,
      }))
      .sort((a, b) => rangoOrder.indexOf(a.rango) - rangoOrder.indexOf(b.rango))

    // -----------------------------------------------------------------------
    // 7. Motivos de Pérdida
    // -----------------------------------------------------------------------
    const motivoMap = new Map<string, number>()
    for (const o of perdidas) {
      const motivo = o.motivoPerdida || 'No especificado'
      motivoMap.set(motivo, (motivoMap.get(motivo) || 0) + 1)
    }
    const motivosPerdida = Array.from(motivoMap.entries())
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    // -----------------------------------------------------------------------
    // 8. Competidores
    // -----------------------------------------------------------------------
    // Fuente A: campo competidorGanador en oportunidades perdidas
    const competidorOppMap = new Map<string, number>()
    for (const o of perdidas) {
      const comp = o.competidorGanador || 'No especificado'
      competidorOppMap.set(comp, (competidorOppMap.get(comp) || 0) + 1)
    }

    // Fuente B: tabla CrmCompetidorLicitacion
    const competidoresLicitacion = await prisma.crmCompetidorLicitacion.groupBy({
      by: ['nombreEmpresa'],
      _count: { id: true },
    })

    // Merge ambas fuentes
    const competidorMerge = new Map<string, number>()
    for (const [name, count] of competidorOppMap) {
      competidorMerge.set(name, (competidorMerge.get(name) || 0) + count)
    }
    for (const c of competidoresLicitacion) {
      const name = c.nombreEmpresa || 'No especificado'
      competidorMerge.set(name, (competidorMerge.get(name) || 0) + c._count.id)
    }

    const competidores = Array.from(competidorMerge.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    // -----------------------------------------------------------------------
    // Respuesta
    // -----------------------------------------------------------------------
    return NextResponse.json({
      resumen,
      porSector,
      porComercial,
      porFuente,
      porPrioridad,
      porRangoValor,
      motivosPerdida,
      competidores,
    })
  } catch (error) {
    console.error('Error al obtener reporte win/loss:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
