import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/seguridad/reportes/consumo-mensual?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Devuelve consumo agrupado por mes:
 *  - cantidad total de items entregados
 *  - costo total (suma de costoUnitario * cantidad), separado por moneda
 *  - desglose por subcategoría
 * Ventana por defecto: últimos 12 meses.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const desdeParam = searchParams.get('desde')
    const hastaParam = searchParams.get('hasta')

    // Default: últimos 12 meses
    const hasta = hastaParam ? new Date(hastaParam) : new Date()
    const desde = desdeParam
      ? new Date(desdeParam)
      : new Date(hasta.getFullYear(), hasta.getMonth() - 11, 1)

    const items = await prisma.entregaEPPItem.findMany({
      where: {
        fechaEntrega: { gte: desde, lte: hasta },
      },
      select: {
        cantidad: true,
        costoUnitario: true,
        costoMoneda: true,
        fechaEntrega: true,
        catalogoEpp: { select: { subcategoria: true } },
      },
    })

    // Agrupar por (año, mes)
    type MesAgg = {
      mes: string // YYYY-MM
      cantidad: number
      costoPEN: number
      costoUSD: number
      porSubcategoria: Record<string, number>
    }
    const buckets = new Map<string, MesAgg>()

    for (const it of items) {
      const d = it.fechaEntrega
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      let agg = buckets.get(mes)
      if (!agg) {
        agg = { mes, cantidad: 0, costoPEN: 0, costoUSD: 0, porSubcategoria: {} }
        buckets.set(mes, agg)
      }
      agg.cantidad += it.cantidad
      const costo = (it.costoUnitario ?? 0) * it.cantidad
      if (it.costoMoneda === 'USD') agg.costoUSD += costo
      else agg.costoPEN += costo
      const sub = it.catalogoEpp.subcategoria
      agg.porSubcategoria[sub] = (agg.porSubcategoria[sub] ?? 0) + it.cantidad
    }

    // Totales globales
    const totalItems = items.length
    const totalCantidad = items.reduce((s, i) => s + i.cantidad, 0)
    const totalCostoPEN = items
      .filter(i => i.costoMoneda !== 'USD')
      .reduce((s, i) => s + (i.costoUnitario ?? 0) * i.cantidad, 0)
    const totalCostoUSD = items
      .filter(i => i.costoMoneda === 'USD')
      .reduce((s, i) => s + (i.costoUnitario ?? 0) * i.cantidad, 0)

    const meses = Array.from(buckets.values()).sort((a, b) => a.mes.localeCompare(b.mes))

    return NextResponse.json({
      desde,
      hasta,
      totales: { items: totalItems, cantidad: totalCantidad, costoPEN: totalCostoPEN, costoUSD: totalCostoUSD },
      meses,
    })
  } catch (error: any) {
    console.error('Error en reporte consumo mensual:', error)
    return NextResponse.json({ error: error?.message || 'Error en reporte' }, { status: 500 })
  }
}
