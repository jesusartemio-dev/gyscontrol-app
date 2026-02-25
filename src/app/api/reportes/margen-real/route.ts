import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

const ROLES_ALLOWED = ['admin', 'gerente']

// ─── Helpers (same as rentabilidad) ───

function convertir(amount: number, fromMoneda: string, toMoneda: string, tipoCambio: number): number {
  if (fromMoneda === toMoneda) return amount
  if (fromMoneda === 'PEN' && toMoneda === 'USD') return amount / tipoCambio
  if (fromMoneda === 'USD' && toMoneda === 'PEN') return amount * tipoCambio
  return amount
}

const round2 = (n: number) => Math.round(n * 100) / 100

function costoHoraPEN(
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

// ─── Distribution ranges ───

const RANGOS = [
  { rango: '<0%', min: -Infinity, max: 0 },
  { rango: '0-10%', min: 0, max: 10 },
  { rango: '10-25%', min: 10, max: 25 },
  { rango: '25-50%', min: 25, max: 50 },
  { rango: '>50%', min: 50, max: Infinity },
]

// ─── Main handler ───

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const estadoFiltro = searchParams.get('estado')
    const monedaReporte = searchParams.get('moneda') || 'USD'
    const clienteId = searchParams.get('clienteId')

    // System config
    const config = await prisma.configuracionGeneral.findFirst()
    const tcDefault = config ? Number(config.tipoCambio) : 3.75
    const horasMes = config?.horasMensuales || 192

    // ─── Parallel queries (same pattern as rentabilidad) ───

    const whereProyecto: Record<string, unknown> = { estado: { notIn: ['cancelado'] } }
    if (estadoFiltro) whereProyecto.estado = estadoFiltro
    if (clienteId) whereProyecto.clienteId = clienteId

    const [
      proyectos,
      ocsByProyectoMoneda,
      snapshotByProyecto,
      horasSinSnapshotByProyecto,
      gastosByProyectoMoneda,
      valorizacionesByProyecto,
    ] = await Promise.all([
      prisma.proyecto.findMany({
        where: whereProyecto,
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
      prisma.ordenCompra.groupBy({
        by: ['proyectoId', 'moneda'],
        where: { estado: { not: 'cancelada' }, proyectoId: { not: null } },
        _sum: { total: true },
      }),
      prisma.$queryRaw<{ proyectoId: string; total: number }[]>`
        SELECT "proyectoId", COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
        FROM registro_horas
        WHERE "costoHora" IS NOT NULL
        GROUP BY "proyectoId"
      `,
      prisma.registroHoras.groupBy({
        by: ['proyectoId', 'usuarioId'],
        where: { costoHora: null },
        _sum: { horasTrabajadas: true },
      }),
      prisma.$queryRaw<{ proyectoId: string; moneda: string; total: number }[]>`
        SELECT hdg."proyectoId", gl."moneda", COALESCE(SUM(gl."monto"), 0) as "total"
        FROM gasto_linea gl
        JOIN hoja_de_gastos hdg ON gl."hojaDeGastosId" = hdg."id"
        WHERE hdg."estado" IN ('validado', 'cerrado')
          AND hdg."proyectoId" IS NOT NULL
        GROUP BY hdg."proyectoId", gl."moneda"
      `,
      // % avance valorización por proyecto
      prisma.$queryRaw<{ proyectoId: string; avance: number }[]>`
        SELECT "proyectoId", MAX("porcentajeAvance") as "avance"
        FROM valorizacion
        WHERE "estado" NOT IN ('anulada', 'borrador')
        GROUP BY "proyectoId"
      `,
    ])

    // ─── Build lookup maps ───

    const snapshotMap = new Map(snapshotByProyecto.map(s => [s.proyectoId, Number(s.total)]))

    const fallbackUserIds = [...new Set(horasSinSnapshotByProyecto.map(h => h.usuarioId))]
    const empleados = fallbackUserIds.length > 0
      ? await prisma.empleado.findMany({
          where: { userId: { in: fallbackUserIds } },
          select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true },
        })
      : []
    const empMap = new Map(empleados.map(e => [e.userId, e]))

    const fallbackHorasMap = new Map<string, { usuarioId: string; horas: number }[]>()
    for (const h of horasSinSnapshotByProyecto) {
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
    for (const g of gastosByProyectoMoneda) {
      const arr = gastosMap.get(g.proyectoId) || []
      arr.push({ moneda: g.moneda, total: Number(g.total) })
      gastosMap.set(g.proyectoId, arr)
    }

    const avanceMap = new Map(valorizacionesByProyecto.map(v => [v.proyectoId, Number(v.avance) || 0]))

    // ─── Calculate per-project margin ───

    const proyectosMargen = proyectos.map(p => {
      const monedaProy = p.moneda || 'USD'
      const tc = p.tipoCambio || tcDefault

      // Equipment costs
      let costoEquipos = 0
      for (const oc of ocMap.get(p.id) || []) {
        costoEquipos += convertir(oc.total, oc.moneda, monedaProy, tc)
      }

      // Service costs (snapshot + fallback)
      const costoSnapshotPEN = snapshotMap.get(p.id) || 0
      let costoFallbackPEN = 0
      for (const h of fallbackHorasMap.get(p.id) || []) {
        const emp = empMap.get(h.usuarioId)
        if (emp) costoFallbackPEN += h.horas * costoHoraPEN(emp, horasMes)
      }
      const costoServicios = convertir(costoSnapshotPEN + costoFallbackPEN, 'PEN', monedaProy, tc)

      // Operational expenses
      let costoGastos = 0
      for (const g of gastosMap.get(p.id) || []) {
        costoGastos += convertir(g.total, g.moneda, monedaProy, tc)
      }

      costoEquipos = round2(costoEquipos)
      const costoServiciosR = round2(costoServicios)
      costoGastos = round2(costoGastos)

      const ingreso = p.totalCliente
      const costoTotal = round2(costoEquipos + costoServiciosR + costoGastos)
      const margen = round2(ingreso - costoTotal)
      const margenPct = ingreso > 0 ? round2((margen / ingreso) * 100) : 0

      // Convert to report currency if needed
      const ingresoR = round2(convertir(ingreso, monedaProy, monedaReporte, tc))
      const equiposR = round2(convertir(costoEquipos, monedaProy, monedaReporte, tc))
      const serviciosR = round2(convertir(costoServiciosR, monedaProy, monedaReporte, tc))
      const gastosR = round2(convertir(costoGastos, monedaProy, monedaReporte, tc))
      const costoTotalR = round2(equiposR + serviciosR + gastosR)
      const margenR = round2(ingresoR - costoTotalR)

      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        clienteNombre: p.cliente?.nombre || '',
        estado: p.estado,
        moneda: monedaReporte,
        ingreso: ingresoR,
        equipos: equiposR,
        servicios: serviciosR,
        gastos: gastosR,
        costoTotal: costoTotalR,
        margen: margenR,
        margenPct,
        porcentajeAvanceValorizacion: round2(avanceMap.get(p.id) || 0),
      }
    })

    // Sort by margenPct descending
    proyectosMargen.sort((a, b) => b.margenPct - a.margenPct)

    // ─── Aggregations ───

    let totalIngreso = 0
    let totalCosto = 0
    let totalEquipos = 0
    let totalServicios = 0
    let totalGastos = 0

    for (const p of proyectosMargen) {
      totalIngreso += p.ingreso
      totalCosto += p.costoTotal
      totalEquipos += p.equipos
      totalServicios += p.servicios
      totalGastos += p.gastos
    }

    const totalMargen = round2(totalIngreso - totalCosto)
    const margenPctPromedio = totalIngreso > 0 ? round2((totalMargen / totalIngreso) * 100) : 0

    // Top 5 best / worst
    const conIngreso = proyectosMargen.filter(p => p.ingreso > 0)
    const topMejores = conIngreso.slice(0, 5)
    const topPeores = conIngreso.slice(-5).reverse()

    // Distribution by margin range
    const distribucion = RANGOS.map(r => {
      const enRango = proyectosMargen.filter(p => {
        if (r.max === Infinity) return p.margenPct >= r.min
        if (r.min === -Infinity) return p.margenPct < r.max
        return p.margenPct >= r.min && p.margenPct < r.max
      })
      return {
        rango: r.rango,
        cantidad: enRango.length,
        total: round2(enRango.reduce((s, p) => s + p.ingreso, 0)),
      }
    })

    return NextResponse.json({
      proyectos: proyectosMargen,
      resumen: {
        totalProyectos: proyectosMargen.length,
        totalIngreso: round2(totalIngreso),
        totalCosto: round2(totalCosto),
        totalMargen,
        margenPctPromedio,
        moneda: monedaReporte,
        totalEquipos: round2(totalEquipos),
        totalServicios: round2(totalServicios),
        totalGastos: round2(totalGastos),
      },
      topMejores,
      topPeores,
      distribucion,
      fechaCalculo: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error en reporte margen real:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
