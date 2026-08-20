import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'
import { convertirMonto, type TasasCambio } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

const round2 = (n: number) => Math.round(n * 100) / 100

function costoHoraPEN(
  emp: { sueldoPlanilla: number | null; sueldoHonorarios: number | null; asignacionFamiliar: number; emo: number; regimenLaboral?: 'mype' | 'general' },
  horasMensuales: number
): number {
  const costos = calcularCostosLaborales({
    sueldoPlanilla: emp.sueldoPlanilla || 0,
    sueldoHonorarios: emp.sueldoHonorarios || 0,
    asignacionFamiliar: emp.asignacionFamiliar || 0,
    emo: emp.emo || 25,
    regimenLaboral: emp.regimenLaboral,
  })
  return horasMensuales > 0 ? costos.totalMensual / horasMensuales : 0
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await context.params

    const [config, proyecto, ocsByCurrency, costoSnapshotRaw, horasSinSnapshot, gastosByCurrency] =
      await Promise.all([
        prisma.configuracionGeneral.findFirst(),
        prisma.proyecto.findUnique({
          where: { id: proyectoId },
          select: { moneda: true, tipoCambio: true },
        }),
        prisma.ordenCompra.groupBy({
          by: ['moneda'],
          where: { proyectoId, estado: { notIn: ['cancelada', 'borrador'] } },
          _sum: { total: true },
        }),
        prisma.$queryRaw<{ total: number }[]>`
          SELECT COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
          FROM registro_horas
          WHERE "proyectoId" = ${proyectoId}
            AND "costoHora" IS NOT NULL
            AND "aprobado" = true
        `,
        prisma.registroHoras.groupBy({
          by: ['usuarioId'],
          where: { proyectoId, costoHora: null, aprobado: true },
          _sum: { horasTrabajadas: true },
        }),
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

    const tcDefault = config ? Number(config.tipoCambio) : 3.75
    const tcEurDefault = config ? Number(config.tipoCambioEur) : 1.08
    const horasMes = config?.horasMensuales || 192
    const monedaProy = proyecto.moneda || 'USD'
    const tc = proyecto.tipoCambio || tcDefault
    const tasas: TasasCambio = { penPorUsd: tc, usdPorEur: tcEurDefault }

    // costoEquipos: OC totals converted to project currency
    let costoEquipos = 0
    for (const oc of ocsByCurrency) {
      costoEquipos += convertirMonto(Number(oc._sum.total) || 0, oc.moneda, monedaProy, tasas)
    }

    // costoServicios: snapshot (PEN) + fallback via payroll (PEN), then convert
    const costoSnapshotPEN = Number(costoSnapshotRaw[0]?.total || 0)
    let costoFallbackPEN = 0
    if (horasSinSnapshot.length > 0) {
      const userIds = horasSinSnapshot.map(h => h.usuarioId)
      const empleados = await prisma.empleado.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true, regimenLaboral: true },
      })
      const empMap = new Map(empleados.map(e => [e.userId, e]))
      for (const h of horasSinSnapshot) {
        const emp = empMap.get(h.usuarioId)
        if (emp) costoFallbackPEN += (h._sum.horasTrabajadas || 0) * costoHoraPEN(emp, horasMes)
      }
    }
    const costoServicios = convertirMonto(costoSnapshotPEN + costoFallbackPEN, 'PEN', monedaProy, tasas)

    // costoGastos: expense line items per currency
    let costoGastos = 0
    for (const g of gastosByCurrency) {
      costoGastos += convertirMonto(Number(g.total), g.moneda, monedaProy, tasas)
    }

    return NextResponse.json({
      equipos: round2(costoEquipos),
      servicios: round2(costoServicios),
      gastos: round2(costoGastos),
      total: round2(costoEquipos + costoServicios + costoGastos),
    })
  } catch (error) {
    console.error('Error costos-reales:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
