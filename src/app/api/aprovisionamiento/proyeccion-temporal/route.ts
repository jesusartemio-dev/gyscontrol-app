import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }

    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // 1. Get all listas for the project with their items
    const listas = await prisma.listaEquipo.findMany({
      where: {
        proyectoId,
        ...(fechaDesde && fechaHasta ? {
          fechaNecesaria: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta)
          }
        } : {})
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaNecesaria: true,
        listaEquipoItem: {
          select: {
            presupuesto: true,
            precioElegido: true,
            cantidad: true,
            costoReal: true
          }
        }
      }
    })

    // 2. Get all pedidos for the project
    const pedidos = await prisma.pedidoEquipo.findMany({
      where: {
        proyectoId,
        ...(fechaDesde && fechaHasta ? {
          fechaNecesaria: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta)
          }
        } : {})
      },
      select: {
        id: true,
        codigo: true,
        estado: true,
        fechaNecesaria: true,
        fechaPedido: true,
        presupuestoTotal: true,
        costoRealTotal: true,
        pedidoEquipoItem: {
          select: {
            precioUnitario: true,
            cantidadPedida: true,
            cantidadAtendida: true,
            costoTotal: true,
            estado: true
          }
        }
      }
    })

    // 3. Group listas by MONTH (monthly cost projections)
    const proyeccionMensual: Array<{
      mes: string
      mesLabel: string
      cantidadListas: number
      presupuestoTotal: number
      costoRealTotal: number
    }> = []

    const listasPorMes = new Map<string, typeof listas>()
    for (const lista of listas) {
      if (!lista.fechaNecesaria) continue
      const fecha = new Date(lista.fechaNecesaria)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      if (!listasPorMes.has(mesKey)) listasPorMes.set(mesKey, [])
      listasPorMes.get(mesKey)!.push(lista)
    }

    for (const [mes, listasDelMes] of Array.from(listasPorMes.entries()).sort()) {
      const presupuesto = listasDelMes.reduce((sum, l) => {
        const itemsTotal = l.listaEquipoItem.reduce((s, item) => {
          return s + ((item.precioElegido ?? item.presupuesto ?? 0) * (item.cantidad || 1))
        }, 0)
        return sum + itemsTotal
      }, 0)

      const costoReal = listasDelMes.reduce((sum, l) => {
        return sum + l.listaEquipoItem.reduce((s, item) => s + (item.costoReal || 0), 0)
      }, 0)

      const [year, month] = mes.split('-')
      const mesLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

      proyeccionMensual.push({
        mes,
        mesLabel,
        cantidadListas: listasDelMes.length,
        presupuestoTotal: Math.round(presupuesto * 100) / 100,
        costoRealTotal: Math.round(costoReal * 100) / 100
      })
    }

    // 4. Group pedidos by WEEK (weekly exact costs)
    const proyeccionSemanal: Array<{
      semana: string
      semanaLabel: string
      cantidadPedidos: number
      costoPresupuestado: number
      costoReal: number
    }> = []

    const pedidosPorSemana = new Map<string, typeof pedidos>()
    for (const pedido of pedidos) {
      if (!pedido.fechaNecesaria) continue
      const fecha = new Date(pedido.fechaNecesaria)
      // ISO week calculation
      const startOfYear = new Date(fecha.getFullYear(), 0, 1)
      const weekNumber = Math.ceil(((fecha.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7)
      const semanaKey = `${fecha.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
      if (!pedidosPorSemana.has(semanaKey)) pedidosPorSemana.set(semanaKey, [])
      pedidosPorSemana.get(semanaKey)!.push(pedido)
    }

    for (const [semana, pedidosDeSemana] of Array.from(pedidosPorSemana.entries()).sort()) {
      const costoPresupuestado = pedidosDeSemana.reduce((sum, p) => sum + (p.presupuestoTotal || 0), 0)
      const costoReal = pedidosDeSemana.reduce((sum, p) => sum + (p.costoRealTotal || 0), 0)

      const [year, weekPart] = semana.split('-W')
      const semanaLabel = `Semana ${weekPart}, ${year}`

      proyeccionSemanal.push({
        semana,
        semanaLabel,
        cantidadPedidos: pedidosDeSemana.length,
        costoPresupuestado: Math.round(costoPresupuestado * 100) / 100,
        costoReal: Math.round(costoReal * 100) / 100
      })
    }

    // 5. Calculate deviation KPIs
    const totalPresupuestoListas = proyeccionMensual.reduce((s, m) => s + m.presupuestoTotal, 0)
    const totalCostoRealListas = proyeccionMensual.reduce((s, m) => s + m.costoRealTotal, 0)
    const totalPresupuestoPedidos = proyeccionSemanal.reduce((s, m) => s + m.costoPresupuestado, 0)
    const totalCostoRealPedidos = proyeccionSemanal.reduce((s, m) => s + m.costoReal, 0)

    const kpis = {
      totalListas: listas.length,
      totalPedidos: pedidos.length,
      presupuestoListasTotal: Math.round(totalPresupuestoListas * 100) / 100,
      costoRealListasTotal: Math.round(totalCostoRealListas * 100) / 100,
      presupuestoPedidosTotal: Math.round(totalPresupuestoPedidos * 100) / 100,
      costoRealPedidosTotal: Math.round(totalCostoRealPedidos * 100) / 100,
      desviacionListas: Math.round((totalCostoRealListas - totalPresupuestoListas) * 100) / 100,
      desviacionPedidos: Math.round((totalCostoRealPedidos - totalPresupuestoPedidos) * 100) / 100,
      porcentajeEjecucionListas: totalPresupuestoListas > 0
        ? Math.round((totalCostoRealListas / totalPresupuestoListas) * 10000) / 100
        : 0,
      porcentajeEjecucionPedidos: totalPresupuestoPedidos > 0
        ? Math.round((totalCostoRealPedidos / totalPresupuestoPedidos) * 10000) / 100
        : 0
    }

    return NextResponse.json({
      proyeccionMensual,
      proyeccionSemanal,
      kpis
    })

  } catch (error) {
    console.error('Error en proyección temporal:', error)
    return NextResponse.json(
      { error: 'Error al calcular proyección temporal' },
      { status: 500 }
    )
  }
}
