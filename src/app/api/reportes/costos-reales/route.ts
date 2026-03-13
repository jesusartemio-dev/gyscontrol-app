import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor']

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
    const monedaReporte = searchParams.get('moneda') || 'USD'
    const estadoFiltro = searchParams.get('estado')
    const proyectoId = searchParams.get('proyectoId')

    const config = await prisma.configuracionGeneral.findFirst()
    const tcDefault = config ? Number(config.tipoCambio) : 3.75
    const horasMes = config?.horasMensuales || 192

    const whereProyecto: Record<string, unknown> = { estado: { notIn: ['cancelado'] } }
    if (estadoFiltro) whereProyecto.estado = estadoFiltro
    if (proyectoId) whereProyecto.id = proyectoId

    // ─── Parallel queries ───
    const [
      proyectos,
      ocsByProyectoMoneda,
      snapshotByProyecto,
      horasSinSnapshotByProyecto,
      gastosByProyectoMoneda,
      // Detalle de horas por usuario y proyecto (para desglose de servicios)
      horasDetalleByUsuario,
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
          AND "aprobado" = true
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
        WHERE hdg."estado" IN ('validado', 'cerrado')
          AND hdg."proyectoId" IS NOT NULL
        GROUP BY hdg."proyectoId", gl."moneda"
      `,
      // Detalle por usuario+proyecto con snapshot (solo horas aprobadas)
      prisma.$queryRaw<{ proyectoId: string; usuarioId: string; horas: number; costo: number }[]>`
        SELECT "proyectoId", "usuarioId",
          COALESCE(SUM("horasTrabajadas"), 0) as "horas",
          COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "costo"
        FROM registro_horas
        WHERE "costoHora" IS NOT NULL
          AND "aprobado" = true
        GROUP BY "proyectoId", "usuarioId"
      `,
    ])

    // Fetch user names for detail
    const allUserIds = new Set<string>()
    for (const h of horasDetalleByUsuario) allUserIds.add(h.usuarioId)
    for (const h of horasSinSnapshotByProyecto) allUserIds.add(h.usuarioId)

    const [usuarios, empleados] = await Promise.all([
      allUserIds.size > 0
        ? prisma.user.findMany({
            where: { id: { in: [...allUserIds] } },
            select: { id: true, name: true },
          })
        : [],
      allUserIds.size > 0
        ? prisma.empleado.findMany({
            where: { userId: { in: [...allUserIds] } },
            select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true },
          })
        : [],
    ])

    const userMap = new Map(usuarios.map(u => [u.id, u.name || 'Sin nombre']))
    const empMap = new Map(empleados.map(e => [e.userId, e]))

    // ─── Build lookup maps ───
    const snapshotMap = new Map(snapshotByProyecto.map(s => [s.proyectoId, Number(s.total)]))

    const fallbackHorasMap = new Map<string, { usuarioId: string; horas: number }[]>()
    for (const h of horasSinSnapshotByProyecto) {
      const arr = fallbackHorasMap.get(h.proyectoId) || []
      arr.push({ usuarioId: h.usuarioId, horas: h._sum.horasTrabajadas || 0 })
      fallbackHorasMap.set(h.proyectoId, arr)
    }

    // Detalle snapshot por proyecto
    const snapshotDetalleMap = new Map<string, { usuarioId: string; horas: number; costo: number }[]>()
    for (const h of horasDetalleByUsuario) {
      const arr = snapshotDetalleMap.get(h.proyectoId) || []
      arr.push({ usuarioId: h.usuarioId, horas: Number(h.horas), costo: Number(h.costo) })
      snapshotDetalleMap.set(h.proyectoId, arr)
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

    // ─── Calculate per-project costs with user detail ───
    let totalEquipos = 0
    let totalServicios = 0
    let totalGastos = 0
    let totalHoras = 0

    const proyectosResult = proyectos.map(p => {
      const monedaProy = p.moneda || 'USD'
      const tc = p.tipoCambio || tcDefault

      // Equipment
      let costoEquipos = 0
      for (const oc of ocMap.get(p.id) || []) {
        costoEquipos += convertir(oc.total, oc.moneda, monedaProy, tc)
      }

      // Services - build user detail
      const usuariosDetalle: { usuarioId: string; nombre: string; horas: number; costoHora: number; subtotal: number }[] = []

      // Users with snapshot
      for (const h of snapshotDetalleMap.get(p.id) || []) {
        const costoHoraCalc = h.horas > 0 ? h.costo / h.horas : 0
        const subtotalReporte = convertir(h.costo, 'PEN', monedaReporte, tc)
        usuariosDetalle.push({
          usuarioId: h.usuarioId,
          nombre: userMap.get(h.usuarioId) || 'Sin nombre',
          horas: round2(h.horas),
          costoHora: round2(convertir(costoHoraCalc, 'PEN', monedaReporte, tc)),
          subtotal: round2(subtotalReporte),
        })
      }

      // Users without snapshot (fallback)
      for (const h of fallbackHorasMap.get(p.id) || []) {
        const emp = empMap.get(h.usuarioId)
        const chPEN = emp ? costoHoraPEN(emp, horasMes) : 0
        const costoPEN = h.horas * chPEN
        const subtotalReporte = convertir(costoPEN, 'PEN', monedaReporte, tc)
        // Check if user already in list (merge)
        const existing = usuariosDetalle.find(u => u.usuarioId === h.usuarioId)
        if (existing) {
          existing.horas = round2(existing.horas + h.horas)
          existing.subtotal = round2(existing.subtotal + subtotalReporte)
          existing.costoHora = existing.horas > 0 ? round2(existing.subtotal / existing.horas) : 0
        } else {
          usuariosDetalle.push({
            usuarioId: h.usuarioId,
            nombre: userMap.get(h.usuarioId) || 'Sin nombre',
            horas: round2(h.horas),
            costoHora: round2(convertir(chPEN, 'PEN', monedaReporte, tc)),
            subtotal: round2(subtotalReporte),
          })
        }
      }

      const costoSnapshotPEN = snapshotMap.get(p.id) || 0
      let costoFallbackPEN = 0
      for (const h of fallbackHorasMap.get(p.id) || []) {
        const emp = empMap.get(h.usuarioId)
        if (emp) costoFallbackPEN += h.horas * costoHoraPEN(emp, horasMes)
      }
      const costoServicios = convertir(costoSnapshotPEN + costoFallbackPEN, 'PEN', monedaProy, tc)

      // Expenses
      let costoGastos = 0
      for (const g of gastosMap.get(p.id) || []) {
        costoGastos += convertir(g.total, g.moneda, monedaProy, tc)
      }

      const equiposR = round2(convertir(costoEquipos, monedaProy, monedaReporte, tc))
      const serviciosR = round2(convertir(costoServicios, monedaProy, monedaReporte, tc))
      const gastosR = round2(convertir(costoGastos, monedaProy, monedaReporte, tc))
      const horasProyecto = round2(usuariosDetalle.reduce((s, u) => s + u.horas, 0))

      totalEquipos += equiposR
      totalServicios += serviciosR
      totalGastos += gastosR
      totalHoras += horasProyecto

      // Sort detalle by subtotal desc
      usuariosDetalle.sort((a, b) => b.subtotal - a.subtotal)

      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        clienteNombre: p.cliente?.nombre || '',
        estado: p.estado,
        moneda: monedaReporte,
        equipos: equiposR,
        servicios: serviciosR,
        gastos: gastosR,
        total: round2(equiposR + serviciosR + gastosR),
        horas: horasProyecto,
        usuariosDetalle,
      }
    })

    // Filter out projects with zero costs
    const proyectosConCosto = proyectosResult.filter(p => p.total > 0)
    proyectosConCosto.sort((a, b) => b.total - a.total)

    return NextResponse.json({
      proyectos: proyectosConCosto,
      resumen: {
        totalProyectos: proyectosConCosto.length,
        totalEquipos: round2(totalEquipos),
        totalServicios: round2(totalServicios),
        totalGastos: round2(totalGastos),
        totalGeneral: round2(totalEquipos + totalServicios + totalGastos),
        totalHoras: round2(totalHoras),
        moneda: monedaReporte,
      },
      fechaCalculo: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error en reporte costos-reales:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
