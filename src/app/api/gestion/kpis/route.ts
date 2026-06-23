import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

function kpiConvertir(amount: number, from: string, to: string, tc: number): number {
  if (from === to) return amount
  if (from === 'PEN' && to === 'USD') return amount / tc
  if (from === 'USD' && to === 'PEN') return amount * tc
  return amount
}

function kpiCostoHoraPEN(
  emp: { sueldoPlanilla: number | null; sueldoHonorarios: number | null; asignacionFamiliar: number; emo: number },
  horasMensuales: number,
): number {
  const costos = calcularCostosLaborales({
    sueldoPlanilla: emp.sueldoPlanilla || 0,
    sueldoHonorarios: emp.sueldoHonorarios || 0,
    asignacionFamiliar: emp.asignacionFamiliar || 0,
    emo: emp.emo || 25,
  })
  return horasMensuales > 0 ? costos.totalMensual / horasMensuales : 0
}

async function calcularCostosEjecutados(
  proyectos: { id: string; moneda: string | null; tipoCambio: number | null }[],
  tcDefault: number,
  horasMes: number,
): Promise<Map<string, number>> {
  const [ocsByProyectoMoneda, snapshotHoras, fallbackHoras, gastosData] = await Promise.all([
    prisma.ordenCompra.groupBy({
      by: ['proyectoId', 'moneda'],
      where: { estado: { notIn: ['cancelada', 'borrador'] }, proyectoId: { not: null } },
      _sum: { total: true },
    }),
    prisma.$queryRaw<{ proyectoId: string; total: number }[]>`
      SELECT "proyectoId", COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
      FROM registro_horas
      WHERE "costoHora" IS NOT NULL AND "aprobado" = true
      GROUP BY "proyectoId"
    `,
    prisma.registroHoras.groupBy({
      by: ['proyectoId', 'usuarioId'],
      where: { costoHora: null, aprobado: true },
      _sum: { horasTrabajadas: true },
    }),
    prisma.$queryRaw<{ proyectoId: string; moneda: string; total: number }[]>`
      SELECT hdg."proyectoId", gl."moneda", COALESCE(SUM(gl."monto"), 0) as "total"
      FROM gasto_linea gl
      JOIN hoja_de_gastos hdg ON gl."hojaDeGastosId" = hdg."id"
      WHERE hdg."estado" IN ('validado', 'cerrado') AND hdg."proyectoId" IS NOT NULL
      GROUP BY hdg."proyectoId", gl."moneda"
    `,
  ])

  const snapshotMap = new Map(snapshotHoras.map(s => [s.proyectoId, Number(s.total)]))

  const fallbackUserIds = [...new Set(fallbackHoras.map(h => h.usuarioId))]
  const empleados = fallbackUserIds.length > 0
    ? await prisma.empleado.findMany({
        where: { userId: { in: fallbackUserIds } },
        select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true },
      })
    : []
  const empMap = new Map(empleados.map(e => [e.userId, e]))

  const fallbackHorasMap = new Map<string, { usuarioId: string; horas: number }[]>()
  for (const h of fallbackHoras) {
    const arr = fallbackHorasMap.get(h.proyectoId) || []
    arr.push({ usuarioId: h.usuarioId, horas: h._sum.horasTrabajadas || 0 })
    fallbackHorasMap.set(h.proyectoId, arr)
  }

  const ocMap = new Map<string, { moneda: string; total: number }[]>()
  for (const oc of ocsByProyectoMoneda) {
    if (!oc.proyectoId) continue
    const arr = ocMap.get(oc.proyectoId) || []
    arr.push({ moneda: oc.moneda, total: oc._sum.total || 0 })
    ocMap.set(oc.proyectoId, arr)
  }

  const gastosMap = new Map<string, { moneda: string; total: number }[]>()
  for (const g of gastosData) {
    const arr = gastosMap.get(g.proyectoId) || []
    arr.push({ moneda: g.moneda, total: Number(g.total) })
    gastosMap.set(g.proyectoId, arr)
  }

  const costosMap = new Map<string, number>()
  for (const p of proyectos) {
    const moneda = p.moneda || 'USD'
    const tc = p.tipoCambio || tcDefault

    let costoEquipos = 0
    for (const oc of ocMap.get(p.id) || []) {
      costoEquipos += kpiConvertir(oc.total, oc.moneda, moneda, tc)
    }

    const costoSnapshotPEN = snapshotMap.get(p.id) || 0
    let costoFallbackPEN = 0
    for (const h of fallbackHorasMap.get(p.id) || []) {
      const emp = empMap.get(h.usuarioId)
      if (emp) costoFallbackPEN += h.horas * kpiCostoHoraPEN(emp, horasMes)
    }
    const costoServicios = kpiConvertir(costoSnapshotPEN + costoFallbackPEN, 'PEN', moneda, tc)

    let costoGastos = 0
    for (const g of gastosMap.get(p.id) || []) {
      costoGastos += kpiConvertir(g.total, g.moneda, moneda, tc)
    }

    costosMap.set(p.id, costoEquipos + costoServicios + costoGastos)
  }

  return costosMap
}

// States considered "active" for projects
const ACTIVE_STATES = [
  'en_planificacion', 'listas_pendientes', 'listas_aprobadas',
  'pedidos_creados', 'en_ejecucion', 'en_cierre'
] as const

// States considered "won" or "lost" for opportunities
const WON_STATES = ['seguimiento_proyecto', 'cerrada_ganada'] as const
const LOST_STATES = ['feedback_mejora', 'cerrada_perdida'] as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistico', 'coordinador_logistico', 'coordinador']
    if (!allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Run all queries in parallel for performance
    const [
      comercialData,
      proyectosData,
      logisticaData,
      financieroData,
    ] = await Promise.all([
      getComercialKpis(),
      getProyectosKpis(),
      getLogisticaKpis(),
      getFinancieroKpis(),
    ])

    return NextResponse.json({
      comercial: comercialData,
      proyectos: proyectosData,
      logistica: logisticaData,
      financiero: financieroData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('KPI API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ==========================================
// COMERCIAL KPIs
// ==========================================
async function getComercialKpis() {
  const [oportunidades, cotizaciones, proyectosFromOpp] = await Promise.all([
    // All opportunities with estado
    prisma.crmOportunidad.findMany({
      select: {
        id: true,
        estado: true,
        valorEstimado: true,
        probabilidad: true,
        createdAt: true,
        fechaCierre: true,
      }
    }),
    // Cotizaciones for margin analysis
    prisma.cotizacion.findMany({
      where: { estado: 'aprobada' },
      select: {
        id: true,
        totalInterno: true,
        totalCliente: true,
        grandTotal: true,
      }
    }),
    // Projects with financial data (created from quotes)
    prisma.proyecto.findMany({
      where: {
        estado: { notIn: ['cancelado'] },
        cotizacionId: { not: null },
      },
      select: {
        id: true,
        cotizacionId: true,
        totalInterno: true,
        totalCliente: true,
        totalReal: true,
        grandTotal: true,
      }
    }),
  ])

  // KPI 1: Win Rate
  const won = oportunidades.filter(o => (WON_STATES as readonly string[]).includes(o.estado)).length
  const lost = oportunidades.filter(o => (LOST_STATES as readonly string[]).includes(o.estado)).length
  const totalClosed = won + lost
  const winRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0

  // KPI 2: Pipeline Ponderado (active opportunities)
  const activeOpp = oportunidades.filter(o =>
    !(WON_STATES as readonly string[]).includes(o.estado) &&
    !(LOST_STATES as readonly string[]).includes(o.estado)
  )
  const pipelinePonderado = activeOpp.reduce((sum, o) => {
    return sum + ((o.valorEstimado || 0) * (o.probabilidad || 0) / 100)
  }, 0)
  const pipelineTotal = activeOpp.reduce((sum, o) => sum + (o.valorEstimado || 0), 0)

  // KPI 3: Margen Cotizado vs Real
  // Compare what was quoted (totalCliente - totalInterno) vs what's actually happening
  let margenCotizadoPromedio = 0
  let margenRealPromedio = 0
  const projectsWithQuotes = proyectosFromOpp.filter(p => p.totalCliente > 0)
  if (projectsWithQuotes.length > 0) {
    margenCotizadoPromedio = projectsWithQuotes.reduce((sum, p) => {
      return sum + ((p.totalCliente - p.totalInterno) / p.totalCliente * 100)
    }, 0) / projectsWithQuotes.length

    const projectsWithCosts = projectsWithQuotes.filter(p => p.totalReal > 0)
    if (projectsWithCosts.length > 0) {
      margenRealPromedio = projectsWithCosts.reduce((sum, p) => {
        return sum + ((p.totalCliente - p.totalReal) / p.totalCliente * 100)
      }, 0) / projectsWithCosts.length
    }
  }

  return {
    winRate: {
      valor: winRate,
      meta: 30,
      ganadas: won,
      perdidas: lost,
      total: totalClosed,
    },
    pipelinePonderado: {
      valor: Math.round(pipelinePonderado),
      pipelineTotal: Math.round(pipelineTotal),
      oportunidadesActivas: activeOpp.length,
    },
    margen: {
      cotizado: Math.round(margenCotizadoPromedio * 10) / 10,
      real: Math.round(margenRealPromedio * 10) / 10,
      diferencia: Math.round((margenRealPromedio - margenCotizadoPromedio) * 10) / 10,
      proyectosAnalizados: projectsWithQuotes.length,
    },
  }
}

// ==========================================
// PROYECTOS KPIs
// ==========================================
async function getProyectosKpis() {
  const now = new Date()

  const config = await prisma.configuracionGeneral.findFirst()
  const tcDefault = config ? Number(config.tipoCambio) : 3.75
  const horasMes = config?.horasMensuales || 192

  const [proyectosActivos, tareasAtrasadas, edtsConHoras] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estado: { in: [...ACTIVE_STATES] } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        totalInterno: true,
        totalCliente: true,
        progresoGeneral: true,
        moneda: true,
        tipoCambio: true,
      }
    }),
    prisma.proyectoTarea.count({
      where: { estado: { in: ['pendiente', 'en_progreso'] }, fechaFin: { lt: now } },
    }),
    prisma.proyectoEdt.findMany({
      where: {
        proyecto: { estado: { in: [...ACTIVE_STATES] } },
        horasPlan: { gt: 0 },
      },
      select: {
        id: true,
        horasPlan: true,
        horasReales: true,
        estado: true,
        nombre: true,
        proyecto: { select: { codigo: true } },
      }
    }),
  ])

  // KPI 4: Desviación de Horas (plan vs real)
  let totalHorasPlan = 0
  let totalHorasReales = 0
  let edtsConDesviacion = 0

  edtsConHoras.forEach(edt => {
    const plan = Number(edt.horasPlan) || 0
    const real = Number(edt.horasReales) || 0
    if (plan > 0) {
      totalHorasPlan += plan
      totalHorasReales += real
      if (real > plan * 1.1) edtsConDesviacion++
    }
  })

  const desviacionHoras = totalHorasPlan > 0
    ? Math.round(((totalHorasReales - totalHorasPlan) / totalHorasPlan) * 100 * 10) / 10
    : 0

  // KPI 5: Proyectos en Rojo — usa costos ejecutados reales (OC + Horas + Gastos)
  const costosMap = await calcularCostosEjecutados(proyectosActivos, tcDefault, horasMes)

  const proyectosConPresupuesto = proyectosActivos.filter(p => p.totalInterno > 0)
  const proyectosConCosto = proyectosConPresupuesto.filter(p => (costosMap.get(p.id) || 0) > 0)
  const proyectosEnRojo = proyectosConCosto.filter(p => (costosMap.get(p.id) || 0) > p.totalInterno)

  // KPI 6: Tareas Atrasadas
  const totalTareasActivas = await prisma.proyectoTarea.count({
    where: { estado: { in: ['pendiente', 'en_progreso'] } },
  })

  return {
    desviacionHoras: {
      valor: desviacionHoras,
      horasPlan: Math.round(totalHorasPlan),
      horasReales: Math.round(totalHorasReales),
      edtsConDesviacion,
      totalEdts: edtsConHoras.length,
    },
    proyectosEnRojo: {
      valor: proyectosEnRojo.length,
      total: proyectosConCosto.length,
      porcentaje: proyectosConCosto.length > 0
        ? Math.round((proyectosEnRojo.length / proyectosConCosto.length) * 100)
        : 0,
      detalle: proyectosEnRojo.slice(0, 5).map(p => {
        const costo = costosMap.get(p.id) || 0
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          sobrecosto: Math.round(((costo - p.totalInterno) / p.totalInterno) * 100),
        }
      }),
    },
    tareasAtrasadas: {
      valor: tareasAtrasadas,
      totalActivas: totalTareasActivas,
      porcentaje: totalTareasActivas > 0
        ? Math.round((tareasAtrasadas / totalTareasActivas) * 100)
        : 0,
    },
    proyectosActivos: proyectosActivos.length,
    progresoPromedio: proyectosActivos.length > 0
      ? Math.round(proyectosActivos.reduce((s, p) => s + p.progresoGeneral, 0) / proyectosActivos.length)
      : 0,
  }
}

// ==========================================
// LOGÍSTICA KPIs
// ==========================================
async function getLogisticaKpis() {
  const [pedidoItems, listaItems, listas] = await Promise.all([
    // Purchase order items with delivery dates
    prisma.pedidoEquipoItem.findMany({
      where: {
        pedidoEquipo: { estado: { notIn: ['borrador', 'cancelado'] } },
      },
      select: {
        id: true,
        estado: true,
        estadoEntrega: true,
        fechaEntregaEstimada: true,
        fechaEntregaReal: true,
        costoTotal: true,
        pedidoEquipo: {
          select: {
            fechaPedido: true,
            fechaEntregaEstimada: true,
            fechaEntregaReal: true,
          }
        },
      }
    }),
    // Lista items with cost data (aprobado or any with real cost)
    prisma.listaEquipoItem.findMany({
      where: {
        presupuesto: { gt: 0 },
        OR: [
          { costoReal: { gt: 0 } },
          { costoPedido: { gt: 0 } },
          { costoElegido: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        presupuesto: true,
        costoReal: true,
        costoElegido: true,
        costoPedido: true,
      }
    }),
    // Listas for cycle time
    prisma.listaEquipo.findMany({
      where: {
        estado: 'aprobada',
        fechaAprobacionFinal: { not: null },
      },
      select: {
        id: true,
        createdAt: true,
        fechaAprobacionFinal: true,
      }
    }),
  ])

  // KPI 7: Entrega a Tiempo %
  const itemsConEntrega = pedidoItems.filter(i =>
    i.fechaEntregaEstimada && i.fechaEntregaReal
  )
  const itemsATiempo = itemsConEntrega.filter(i => {
    const estimada = new Date(i.fechaEntregaEstimada!)
    const real = new Date(i.fechaEntregaReal!)
    return real <= estimada
  })
  const entregaATiempo = itemsConEntrega.length > 0
    ? Math.round((itemsATiempo.length / itemsConEntrega.length) * 100)
    : 0

  // KPI 8: Ciclo Lista→Entrega (average days)
  const ciclosLista = listas
    .filter(l => l.fechaAprobacionFinal)
    .map(l => {
      const diff = new Date(l.fechaAprobacionFinal!).getTime() - new Date(l.createdAt).getTime()
      return Math.round(diff / (1000 * 60 * 60 * 24))
    })
  const cicloPromedio = ciclosLista.length > 0
    ? Math.round(ciclosLista.reduce((s, d) => s + d, 0) / ciclosLista.length)
    : 0

  // Cycle for orders (pedido date to delivery)
  const ciclosPedido = pedidoItems
    .filter(i => i.fechaEntregaReal && i.pedidoEquipo.fechaPedido)
    .map(i => {
      const diff = new Date(i.fechaEntregaReal!).getTime() - new Date(i.pedidoEquipo.fechaPedido).getTime()
      return Math.round(diff / (1000 * 60 * 60 * 24))
    })
  const cicloPedidoPromedio = ciclosPedido.length > 0
    ? Math.round(ciclosPedido.reduce((s, d) => s + d, 0) / ciclosPedido.length)
    : 0

  // KPI 9: Sobrecosto de Equipos
  let totalPresupuesto = 0
  let totalCostoReal = 0
  let itemsConSobrecosto = 0

  listaItems.forEach(item => {
    const presupuesto = item.presupuesto || 0
    const costoReal = item.costoReal || item.costoPedido || item.costoElegido || 0
    if (presupuesto > 0 && costoReal > 0) {
      totalPresupuesto += presupuesto
      totalCostoReal += costoReal
      if (costoReal > presupuesto * 1.05) itemsConSobrecosto++ // >5% over budget
    }
  })

  const sobrecostoEquipos = totalPresupuesto > 0
    ? Math.round(((totalCostoReal - totalPresupuesto) / totalPresupuesto) * 100 * 10) / 10
    : 0

  // Delivery status breakdown
  const pendientes = pedidoItems.filter(i => i.estadoEntrega === 'pendiente').length
  const enProceso = pedidoItems.filter(i => i.estadoEntrega === 'en_proceso').length
  const entregados = pedidoItems.filter(i => i.estadoEntrega === 'entregado').length
  const retrasados = pedidoItems.filter(i => i.estadoEntrega === 'retrasado').length

  return {
    entregaATiempo: {
      valor: entregaATiempo,
      meta: 95,
      aTiempo: itemsATiempo.length,
      total: itemsConEntrega.length,
    },
    ciclo: {
      lista: cicloPromedio,
      pedido: cicloPedidoPromedio,
      listasAnalizadas: ciclosLista.length,
      pedidosAnalizados: ciclosPedido.length,
    },
    sobrecostoEquipos: {
      valor: sobrecostoEquipos,
      presupuesto: Math.round(totalPresupuesto),
      costoReal: Math.round(totalCostoReal),
      itemsConSobrecosto,
      totalItems: listaItems.filter(i => (i.presupuesto || 0) > 0 && ((i.costoReal || i.costoPedido || i.costoElegido || 0) > 0)).length,
    },
    estadoEntregas: {
      pendientes,
      enProceso,
      entregados,
      retrasados,
      total: pedidoItems.length,
    },
  }
}

// ==========================================
// FINANCIERO / GERENCIA KPIs
// ==========================================
async function getFinancieroKpis() {
  const config = await prisma.configuracionGeneral.findFirst()
  const tcDefault = config ? Number(config.tipoCambio) : 3.75
  const horasMes = config?.horasMensuales || 192

  const [proyectos, horasData, calendario] = await Promise.all([
    prisma.proyecto.findMany({
      where: {
        estado: { notIn: ['cancelado'] },
        totalCliente: { gt: 0 },
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        totalInterno: true,
        totalCliente: true,
        grandTotal: true,
        progresoGeneral: true,
        moneda: true,
        tipoCambio: true,
      }
    }),
    prisma.registroHoras.groupBy({
      by: ['usuarioId'],
      _sum: { horasTrabajadas: true },
      _count: true,
      where: {
        fechaTrabajo: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        }
      }
    }),
    prisma.calendarioLaboral.findFirst({
      where: { activo: true },
      select: { horasPorDia: true },
    }),
  ])

  // Costos ejecutados reales: OC + RegistroHoras + Gastos
  const costosMap = await calcularCostosEjecutados(proyectos, tcDefault, horasMes)

  // KPI 10: Margen Real por Proyecto
  const proyectosConCostos = proyectos.filter(p => (costosMap.get(p.id) || 0) > 0 && p.totalCliente > 0)
  const margenes = proyectosConCostos.map(p => {
    const costo = costosMap.get(p.id) || 0
    return {
      codigo: p.codigo,
      nombre: p.nombre,
      margen: Math.round(((p.totalCliente - costo) / p.totalCliente) * 100 * 10) / 10,
      ganancia: Math.round(p.totalCliente - costo),
    }
  })
  const margenPromedio = margenes.length > 0
    ? Math.round(margenes.reduce((s, m) => s + m.margen, 0) / margenes.length * 10) / 10
    : 0

  const totalRevenue = proyectos.reduce((s, p) => s + p.totalCliente, 0)
  const totalCost = proyectos.reduce((s, p) => s + (costosMap.get(p.id) || 0), 0)

  // KPI 11: Utilización de Recursos
  const horasPorDia = calendario?.horasPorDia || 8
  const now = new Date()
  const diasLaboralesEnMes = 22
  const diasTranscurridos = Math.min(now.getDate(), diasLaboralesEnMes)
  const horasDisponiblesPorPersona = diasTranscurridos * horasPorDia

  const utilizaciones = horasData.map(h => ({
    horasTrabajadas: h._sum.horasTrabajadas || 0,
    utilizacion: horasDisponiblesPorPersona > 0
      ? Math.min(100, Math.round(((h._sum.horasTrabajadas || 0) / horasDisponiblesPorPersona) * 100))
      : 0,
  }))
  const utilizacionPromedio = utilizaciones.length > 0
    ? Math.round(utilizaciones.reduce((s, u) => s + u.utilizacion, 0) / utilizaciones.length)
    : 0

  // KPI 12: Índice de Salud de Proyectos — usa costos ejecutados para penalizar sobrecosto
  const proyectosActivos = proyectos.filter(p => (ACTIVE_STATES as readonly string[]).includes(p.estado as string))
  const saludProyectos = proyectosActivos.map(p => {
    let score = 100
    const costoEjecutado = costosMap.get(p.id) || 0

    if (costoEjecutado > 0 && p.totalInterno > 0) {
      const costRatio = costoEjecutado / p.totalInterno
      if (costRatio > 1.15) score -= 40
      else if (costRatio > 1.05) score -= 20
      else if (costRatio > 1.0) score -= 10
    }

    if (p.progresoGeneral < 10 && p.estado === 'en_ejecucion') score -= 20

    return {
      codigo: p.codigo,
      nombre: p.nombre,
      score: Math.max(0, score),
      estado: score >= 80 ? 'verde' as const : score >= 50 ? 'amarillo' as const : 'rojo' as const,
    }
  })

  const saludPromedio = saludProyectos.length > 0
    ? Math.round(saludProyectos.reduce((s, p) => s + p.score, 0) / saludProyectos.length)
    : 100

  const saludDistribucion = {
    verde: saludProyectos.filter(p => p.estado === 'verde').length,
    amarillo: saludProyectos.filter(p => p.estado === 'amarillo').length,
    rojo: saludProyectos.filter(p => p.estado === 'rojo').length,
  }

  return {
    margenReal: {
      promedio: margenPromedio,
      totalRevenue: Math.round(totalRevenue),
      totalCost: Math.round(totalCost),
      gananciaTotal: Math.round(totalRevenue - totalCost),
      proyectosAnalizados: proyectosConCostos.length,
      peores: [...margenes].sort((a, b) => a.margen - b.margen).slice(0, 3),
      mejores: [...margenes].sort((a, b) => b.margen - a.margen).slice(0, 3),
    },
    utilizacionRecursos: {
      promedio: utilizacionPromedio,
      meta: 80,
      personasActivas: utilizaciones.length,
      horasDisponiblesPorPersona: Math.round(horasDisponiblesPorPersona),
    },
    saludProyectos: {
      promedio: saludPromedio,
      distribucion: saludDistribucion,
      detalle: [...saludProyectos].sort((a, b) => a.score - b.score).slice(0, 5),
    },
  }
}
