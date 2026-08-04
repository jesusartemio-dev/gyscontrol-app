import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { estadoReporteAvanceEnum } from '@/lib/validators/reporteAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'
import { formatearSemanaIso, semanasEnRango, rangoSemanaIso } from '@/lib/utils/isoWeek'

/**
 * GET /api/proyectos/reportes-semanales/rango?proyectoId=X&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD[&estado=...]
 *
 * Vista semana a semana para UN proyecto: una entrada por cada semana ISO del
 * rango, sin huecos. Para las semanas sin ReporteSemanalAvance se informa
 * cuántas jornadas de campo (y cuántas con evidencia) hubo esa semana, para
 * que el frontend pueda ofrecer "Crear reporte" solo donde hay actividad real.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    const fechaDesdeParam = searchParams.get('fechaDesde')
    const fechaHastaParam = searchParams.get('fechaHasta')
    const estadoParam = searchParams.get('estado')

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 })
    }
    if (!fechaDesdeParam || !fechaHastaParam) {
      return NextResponse.json({ error: 'fechaDesde y fechaHasta son requeridos' }, { status: 400 })
    }

    const fechaDesde = new Date(`${fechaDesdeParam}T00:00:00Z`)
    const fechaHasta = new Date(`${fechaHastaParam}T23:59:59Z`)
    if (Number.isNaN(fechaDesde.getTime()) || Number.isNaN(fechaHasta.getTime()) || fechaDesde > fechaHasta) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const estadoFiltro = estadoParam ? estadoReporteAvanceEnum.safeParse(estadoParam) : null

    const semanas = semanasEnRango(fechaDesde, fechaHasta)
    if (semanas.length === 0) {
      return NextResponse.json([])
    }

    // Límites reales de fecha cubiertos por las semanas ISO completas (pueden
    // extenderse un poco más allá de fechaDesde/fechaHasta porque una semana
    // ISO no empieza necesariamente en la fecha exacta filtrada).
    const { fechaInicio: rangoInicio } = rangoSemanaIso(semanas[0])
    const { fechaFin: rangoFin } = rangoSemanaIso(semanas[semanas.length - 1])

    const [reportes, jornadas] = await Promise.all([
      prisma.reporteSemanalAvance.findMany({
        where: { proyectoId, semanaIso: { in: semanas } },
        include: {
          autor: { select: { id: true, name: true } },
          aprobador: { select: { id: true, name: true } },
        },
      }),
      prisma.registroHorasCampo.findMany({
        where: { proyectoId, fechaTrabajo: { gte: rangoInicio, lte: rangoFin } },
        select: { id: true, fechaTrabajo: true, evidenciaAvance: { select: { id: true } } },
      }),
    ])

    const reportesPorSemana = new Map(reportes.map((r) => [r.semanaIso, r]))

    const actividadPorSemana = new Map<string, { jornadas: number; evidencias: number }>()
    for (const j of jornadas) {
      const semanaIso = formatearSemanaIso(j.fechaTrabajo)
      const actual = actividadPorSemana.get(semanaIso) ?? { jornadas: 0, evidencias: 0 }
      actual.jornadas += 1
      if (j.evidenciaAvance) actual.evidencias += 1
      actividadPorSemana.set(semanaIso, actual)
    }

    let resultado = semanas.map((semanaIso) => {
      const reporte = reportesPorSemana.get(semanaIso) ?? null
      const actividad = actividadPorSemana.get(semanaIso) ?? { jornadas: 0, evidencias: 0 }
      const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIso)
      return {
        semanaIso,
        weekStart: fechaInicio.toISOString(),
        weekEnd: fechaFin.toISOString(),
        reporte: reporte
          ? {
              id: reporte.id,
              estado: reporte.estado,
              numero: reporte.numero,
              createdAt: reporte.createdAt,
              autor: reporte.autor,
              aprobador: reporte.aprobador,
            }
          : null,
        jornadasCount: actividad.jornadas,
        evidenciasCount: actividad.evidencias,
      }
    })

    // Con filtro de estado activo, solo tiene sentido mostrar semanas cuyo
    // reporte coincide — las semanas sin reporte (o con otro estado) se ocultan.
    if (estadoFiltro?.success) {
      resultado = resultado.filter((s) => s.reporte?.estado === estadoFiltro.data)
    }

    return NextResponse.json(resultado)
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales/rango]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
