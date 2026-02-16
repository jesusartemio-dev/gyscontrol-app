import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // Fallback exchange rate from system config
    const config = await prisma.configuracionGeneral.findFirst()
    const tcDefault = config ? Number(config.tipoCambio) : 3.75

    if (proyectoId) {
      return await getProyectoDetalle(proyectoId, tcDefault)
    }
    return await getResumenTodos(tcDefault)
  } catch (error) {
    console.error('Error en reporte rentabilidad:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

async function getProyectoDetalle(proyectoId: string, tcDefault: number) {
  const [proyecto, ocsByCurrency, serviciosRaw, gastosByCurrency] = await Promise.all([
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
    // Servicios: costoHora assumed PEN (local labor)
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(rh."horasTrabajadas" * r."costoHora"), 0) as "total"
      FROM registro_horas rh
      JOIN recurso r ON rh."recursoId" = r."id"
      WHERE rh."proyectoId" = ${proyectoId}
    `,
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

  // Servicios (costoHora in PEN) → convert to project currency
  const serviciosRawTotal = Number(serviciosRaw[0]?.total || 0)
  const costoServicios = convertir(serviciosRawTotal, 'PEN', monedaProy, tc)

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

async function getResumenTodos(tcDefault: number) {
  const [proyectos, ocsByProyectoMoneda, serviciosPorProyecto, gastosByProyectoMoneda] = await Promise.all([
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
    // Servicios by project (costoHora in PEN)
    prisma.$queryRaw<{ proyectoId: string; total: number }[]>`
      SELECT rh."proyectoId", COALESCE(SUM(rh."horasTrabajadas" * r."costoHora"), 0) as "total"
      FROM registro_horas rh
      JOIN recurso r ON rh."recursoId" = r."id"
      GROUP BY rh."proyectoId"
    `,
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

  // Build maps: proyectoId → [{ moneda, total }]
  const ocMap = new Map<string, { moneda: string; total: number }[]>()
  for (const oc of ocsByProyectoMoneda) {
    if (!oc.proyectoId) continue
    const arr = ocMap.get(oc.proyectoId) || []
    arr.push({ moneda: oc.moneda, total: oc._sum.total || 0 })
    ocMap.set(oc.proyectoId, arr)
  }

  const serviciosMap = new Map(serviciosPorProyecto.map(s => [s.proyectoId, Number(s.total)]))

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

    // Servicios (PEN) → project currency
    const serviciosRaw = serviciosMap.get(p.id) || 0
    const costoServicios = convertir(serviciosRaw, 'PEN', monedaProy, tc)

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
