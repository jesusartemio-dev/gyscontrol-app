import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor']

// Convert amount from one currency to the project's currency
function convertir(amount: number, fromMoneda: string, toMoneda: string, tipoCambio: number): number {
  if (fromMoneda === toMoneda) return amount
  // tipoCambio = cuántos PEN por 1 USD
  if (fromMoneda === 'PEN' && toMoneda === 'USD') return amount / tipoCambio
  if (fromMoneda === 'USD' && toMoneda === 'PEN') return amount * tipoCambio
  return amount
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Fallback: calculate hourly cost in PEN from current payroll data
function costoHoraPEN(
  emp: { sueldoPlanilla: number | null; sueldoHonorarios: number | null; asignacionFamiliar: number; emo: number },
  horasMensuales: number
): number {
  const costos = calcularCostosLaborales({
    sueldoPlanilla: emp.sueldoPlanilla || 0,
    sueldoHonorarios: emp.sueldoHonorarios || 0,
    asignacionFamiliar: emp.asignacionFamiliar || 0,
    emo: emp.emo || 25,
  })
  return horasMensuales > 0 ? costos.totalMensual / horasMensuales : 0
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    // System config: exchange rate + working hours
    const config = await prisma.configuracionGeneral.findFirst()
    const tcDefault = config ? Number(config.tipoCambio) : 3.75
    const horasMes = config?.horasMensuales || 192

    if (proyectoId) {
      return await getProyectoDetalle(proyectoId, tcDefault, horasMes)
    }
    return await getResumenTodos(tcDefault, horasMes)
  } catch (error) {
    console.error('Error en reporte rentabilidad:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

async function getProyectoDetalle(proyectoId: string, tcDefault: number, horasMes: number) {
  const [proyecto, ocsByCurrency, costoSnapshotRaw, horasSinSnapshot, gastosByCurrency] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        moneda: true,
        tipoCambio: true,
        estado: true,
        totalCliente: true,
        totalEquiposInterno: true,
        totalServiciosInterno: true,
        totalGastosInterno: true,
        cliente: { select: { nombre: true } },
      },
    }),
    // OCs grouped by currency
    prisma.ordenCompra.groupBy({
      by: ['moneda'],
      where: { proyectoId, estado: { not: 'cancelada' } },
      _sum: { total: true },
    }),
    // Snapshot cost: SUM(horas * costoHora) for records WITH snapshot (result in PEN)
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
      FROM registro_horas
      WHERE "proyectoId" = ${proyectoId}
        AND "costoHora" IS NOT NULL
    `,
    // Fallback: hours grouped by user for records WITHOUT snapshot
    prisma.registroHoras.groupBy({
      by: ['usuarioId'],
      where: { proyectoId, costoHora: null },
      _sum: { horasTrabajadas: true },
    }),
    // Gastos grouped by GastoLinea.moneda
    prisma.$queryRaw<{ moneda: string; total: number }[]>`
      SELECT gl."moneda", COALESCE(SUM(gl."monto"), 0) as "total"
      FROM gasto_linea gl
      JOIN hoja_de_gastos hdg ON gl."hojaDeGastosId" = hdg."id"
      WHERE hdg."proyectoId" = ${proyectoId}
        AND hdg."estado" IN ('validado', 'cerrado')
      GROUP BY gl."moneda"
    `,
  ])

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const monedaProy = proyecto.moneda || 'USD'
  const tc = proyecto.tipoCambio || tcDefault

  // Convert OC costs to project currency
  let costoEquipos = 0
  for (const oc of ocsByCurrency) {
    costoEquipos += convertir(oc._sum.total || 0, oc.moneda, monedaProy, tc)
  }

  // Service cost = snapshot (PEN) + fallback (PEN), converted to project currency
  const costoSnapshotPEN = Number(costoSnapshotRaw[0]?.total || 0)
  const costoFallbackPEN = await calcularCostoFallbackPEN(horasSinSnapshot, horasMes)
  const costoServiciosPEN = costoSnapshotPEN + costoFallbackPEN
  const costoServicios = convertir(costoServiciosPEN, 'PEN', monedaProy, tc)

  // Convert gastos by currency
  let costoGastos = 0
  for (const g of gastosByCurrency) {
    costoGastos += convertir(Number(g.total), g.moneda, monedaProy, tc)
  }

  costoEquipos = round2(costoEquipos)
  const costoServiciosR = round2(costoServicios)
  costoGastos = round2(costoGastos)

  const ingreso = proyecto.totalCliente
  const costoTotal = round2(costoEquipos + costoServiciosR + costoGastos)
  const presupuestoTotal = round2(proyecto.totalEquiposInterno + proyecto.totalServiciosInterno + proyecto.totalGastosInterno)
  const margen = round2(ingreso - costoTotal)
  const margenPorcentaje = ingreso > 0 ? round2((margen / ingreso) * 100) : 0

  return NextResponse.json({
    proyecto: {
      id: proyecto.id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      moneda: monedaProy,
      tipoCambio: tc,
      estado: proyecto.estado,
      cliente: proyecto.cliente?.nombre,
    },
    ingreso,
    costos: {
      equipos: {
        presupuesto: proyecto.totalEquiposInterno,
        real: costoEquipos,
        diferencia: round2(proyecto.totalEquiposInterno - costoEquipos),
      },
      servicios: {
        presupuesto: proyecto.totalServiciosInterno,
        real: costoServiciosR,
        diferencia: round2(proyecto.totalServiciosInterno - costoServiciosR),
      },
      gastos: {
        presupuesto: proyecto.totalGastosInterno,
        real: costoGastos,
        diferencia: round2(proyecto.totalGastosInterno - costoGastos),
      },
      total: {
        presupuesto: presupuestoTotal,
        real: costoTotal,
        diferencia: round2(presupuestoTotal - costoTotal),
      },
    },
    margen,
    margenPorcentaje,
  })
}

async function getResumenTodos(tcDefault: number, horasMes: number) {
  const [proyectos, ocsByProyectoMoneda, snapshotByProyecto, horasSinSnapshotByProyecto, gastosByProyectoMoneda] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estado: { notIn: ['cancelado'] } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        moneda: true,
        tipoCambio: true,
        estado: true,
        totalCliente: true,
        totalEquiposInterno: true,
        totalServiciosInterno: true,
        totalGastosInterno: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // OCs grouped by proyectoId + moneda
    prisma.ordenCompra.groupBy({
      by: ['proyectoId', 'moneda'],
      where: { estado: { not: 'cancelada' }, proyectoId: { not: null } },
      _sum: { total: true },
    }),
    // Snapshot cost per project (PEN)
    prisma.$queryRaw<{ proyectoId: string; total: number }[]>`
      SELECT "proyectoId", COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
      FROM registro_horas
      WHERE "costoHora" IS NOT NULL
      GROUP BY "proyectoId"
    `,
    // Fallback: hours without snapshot grouped by proyectoId + usuarioId
    prisma.registroHoras.groupBy({
      by: ['proyectoId', 'usuarioId'],
      where: { costoHora: null },
      _sum: { horasTrabajadas: true },
    }),
    // Gastos grouped by proyectoId + moneda (from GastoLinea)
    prisma.$queryRaw<{ proyectoId: string; moneda: string; total: number }[]>`
      SELECT hdg."proyectoId", gl."moneda", COALESCE(SUM(gl."monto"), 0) as "total"
      FROM gasto_linea gl
      JOIN hoja_de_gastos hdg ON gl."hojaDeGastosId" = hdg."id"
      WHERE hdg."estado" IN ('validado', 'cerrado')
        AND hdg."proyectoId" IS NOT NULL
      GROUP BY hdg."proyectoId", gl."moneda"
    `,
  ])

  // Build snapshot map: proyectoId → total PEN
  const snapshotMap = new Map(snapshotByProyecto.map(s => [s.proyectoId, Number(s.total)]))

  // Fetch empleado data for fallback (users with hours without snapshot)
  const fallbackUserIds = [...new Set(horasSinSnapshotByProyecto.map(h => h.usuarioId))]
  const empleados = fallbackUserIds.length > 0 ? await prisma.empleado.findMany({
    where: { userId: { in: fallbackUserIds } },
    select: {
      userId: true,
      sueldoPlanilla: true,
      sueldoHonorarios: true,
      asignacionFamiliar: true,
      emo: true,
    },
  }) : []
  const empMap = new Map(empleados.map(e => [e.userId, e]))

  // Build fallback hours map: proyectoId → [{ usuarioId, horas }]
  const fallbackHorasMap = new Map<string, { usuarioId: string; horas: number }[]>()
  for (const h of horasSinSnapshotByProyecto) {
    const arr = fallbackHorasMap.get(h.proyectoId) || []
    arr.push({ usuarioId: h.usuarioId, horas: h._sum.horasTrabajadas || 0 })
    fallbackHorasMap.set(h.proyectoId, arr)
  }

  // Build OC map
  const ocMap = new Map<string, { moneda: string; total: number }[]>()
  for (const oc of ocsByProyectoMoneda) {
    if (!oc.proyectoId) continue
    const arr = ocMap.get(oc.proyectoId) || []
    arr.push({ moneda: oc.moneda, total: oc._sum.total || 0 })
    ocMap.set(oc.proyectoId, arr)
  }

  // Build gastos map
  const gastosMap = new Map<string, { moneda: string; total: number }[]>()
  for (const g of gastosByProyectoMoneda) {
    const arr = gastosMap.get(g.proyectoId) || []
    arr.push({ moneda: g.moneda, total: Number(g.total) })
    gastosMap.set(g.proyectoId, arr)
  }

  const resumen = proyectos.map(p => {
    const monedaProy = p.moneda || 'USD'
    const tc = p.tipoCambio || tcDefault
    const ingreso = p.totalCliente

    // Convert OCs
    let costoEquipos = 0
    for (const oc of ocMap.get(p.id) || []) {
      costoEquipos += convertir(oc.total, oc.moneda, monedaProy, tc)
    }

    // Service cost: snapshot (PEN) + fallback from current payroll (PEN)
    const costoSnapshotPEN = snapshotMap.get(p.id) || 0
    let costoFallbackPEN = 0
    for (const h of fallbackHorasMap.get(p.id) || []) {
      const emp = empMap.get(h.usuarioId)
      if (emp) {
        costoFallbackPEN += h.horas * costoHoraPEN(emp, horasMes)
      }
    }
    const costoServicios = convertir(costoSnapshotPEN + costoFallbackPEN, 'PEN', monedaProy, tc)

    // Convert gastos
    let costoGastos = 0
    for (const g of gastosMap.get(p.id) || []) {
      costoGastos += convertir(g.total, g.moneda, monedaProy, tc)
    }

    costoEquipos = round2(costoEquipos)
    const costoServiciosR = round2(costoServicios)
    costoGastos = round2(costoGastos)
    const costoTotal = round2(costoEquipos + costoServiciosR + costoGastos)
    const presupuestoTotal = round2(p.totalEquiposInterno + p.totalServiciosInterno + p.totalGastosInterno)
    const margen = round2(ingreso - costoTotal)
    const margenPorcentaje = ingreso > 0 ? round2((margen / ingreso) * 100) : 0

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      moneda: monedaProy,
      estado: p.estado,
      cliente: p.cliente?.nombre,
      ingreso,
      presupuestoTotal,
      costoEquipos,
      costoServicios: costoServiciosR,
      costoGastos,
      costoTotal,
      margen,
      margenPorcentaje,
    }
  })

  return NextResponse.json({ proyectos: resumen })
}

// Fallback: calculate cost in PEN for records without costoHora snapshot
async function calcularCostoFallbackPEN(
  horasPorUsuario: { usuarioId: string; _sum: { horasTrabajadas: number | null } }[],
  horasMes: number
): Promise<number> {
  if (horasPorUsuario.length === 0) return 0

  const userIds = horasPorUsuario.map(h => h.usuarioId)
  const empleados = await prisma.empleado.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      sueldoPlanilla: true,
      sueldoHonorarios: true,
      asignacionFamiliar: true,
      emo: true,
    },
  })
  const empMap = new Map(empleados.map(e => [e.userId, e]))

  let total = 0
  for (const h of horasPorUsuario) {
    const emp = empMap.get(h.usuarioId)
    if (emp) {
      total += (h._sum.horasTrabajadas || 0) * costoHoraPEN(emp, horasMes)
    }
  }
  return total
}
