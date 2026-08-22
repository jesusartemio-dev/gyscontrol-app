import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getISOWeek, getWeekRange } from '@/lib/utils/timesheetAprobacion'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const MS_PER_DAY = 86_400_000
const SEMANAS_POR_DEFECTO = 16

/**
 * GET /api/gestion/puntualidad-registro?semanas=16
 *
 * Mide con qué puntualidad llega el dato que alimenta la curva S. No mide avance: mide si
 * el registro se está cerrando a tiempo, que es lo que decide si la curva sirve para
 * gestionar o solo para mirar el pasado.
 *
 * Dos indicadores por semana ISO:
 *  - Cobertura de timesheet: de las personas que registraron horas esa semana, cuántas
 *    cerraron el ciclo de aprobación. Una semana sin cerrar NO deja fila en
 *    TimesheetAprobacion, así que "sin fila" = no se completó.
 *  - Cierre de jornadas: cuántas jornadas de esa semana siguen abiertas y cuántos días
 *    tardaron en cerrarse las demás.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const pedidas = Number(req.nextUrl.searchParams.get('semanas'))
    const nSemanas = Number.isFinite(pedidas) && pedidas >= 4 && pedidas <= 52
      ? Math.trunc(pedidas)
      : SEMANAS_POR_DEFECTO

    // Ventana: las últimas nSemanas semanas ISO completas + la actual.
    const hoy = new Date()
    const lunesActual = (() => {
      const dia = hoy.getUTCDay()
      const delta = dia === 0 ? -6 : 1 - dia
      return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) + delta * MS_PER_DAY)
    })()
    const desde = new Date(lunesActual.getTime() - (nSemanas - 1) * 7 * MS_PER_DAY)

    const [registros, aprobaciones, jornadas] = await Promise.all([
      prisma.registroHoras.findMany({
        where: { fechaTrabajo: { gte: desde } },
        select: { fechaTrabajo: true, usuarioId: true },
      }),
      prisma.timesheetAprobacion.findMany({
        where: { estado: 'aprobado' },
        select: { semana: true, usuarioId: true, fechaEnvio: true },
      }),
      prisma.registroHorasCampo.findMany({
        where: { fechaTrabajo: { gte: desde } },
        select: {
          id: true, fechaTrabajo: true, fechaCierre: true, estado: true,
          proyecto: { select: { codigo: true } },
        },
      }),
    ])

    // ── Agregación por semana ISO ──
    type Acc = {
      conHoras: Set<string>
      aprobados: Set<string>
      jornadas: number
      jornadasAbiertas: number
      diasCierre: number[]
    }
    const semanas = new Map<string, Acc>()
    const acc = (k: string): Acc => {
      let a = semanas.get(k)
      if (!a) {
        a = { conHoras: new Set(), aprobados: new Set(), jornadas: 0, jornadasAbiertas: 0, diasCierre: [] }
        semanas.set(k, a)
      }
      return a
    }

    for (const r of registros) acc(getISOWeek(r.fechaTrabajo)).conHoras.add(r.usuarioId)
    for (const a of aprobaciones) {
      if (semanas.has(a.semana)) acc(a.semana).aprobados.add(a.usuarioId)
    }
    for (const j of jornadas) {
      const a = acc(getISOWeek(j.fechaTrabajo))
      a.jornadas += 1
      if (j.estado === 'iniciado') a.jornadasAbiertas += 1
      else if (j.fechaCierre) {
        a.diasCierre.push(Math.round((j.fechaCierre.getTime() - j.fechaTrabajo.getTime()) / MS_PER_DAY))
      }
    }

    const mediana = (xs: number[]): number | null => {
      if (xs.length === 0) return null
      const s = [...xs].sort((a, b) => a - b)
      return s[Math.floor(s.length / 2)]
    }

    const filas = [...semanas.keys()].sort().map((semanaIso) => {
      const a = semanas.get(semanaIso)!
      const { inicio, fin } = getWeekRange(semanaIso)
      const conHoras = a.conHoras.size
      // Solo cuentan como cubiertos los que además registraron horas esa semana.
      const cerraron = [...a.aprobados].filter((u) => a.conHoras.has(u)).length
      return {
        semanaIso,
        desde: inicio.toISOString().slice(0, 10),
        hasta: fin.toISOString().slice(0, 10),
        enCurso: fin >= hoy,
        personasConHoras: conHoras,
        timesheetsCerrados: cerraron,
        cobertura: conHoras > 0 ? Number(((cerraron / conHoras) * 100).toFixed(0)) : null,
        jornadas: a.jornadas,
        jornadasAbiertas: a.jornadasAbiertas,
        diasCierreMediana: mediana(a.diasCierre),
      }
    })

    // ── Resumen: últimas 8 semanas ya terminadas ──
    const cerradas = filas.filter((f) => !f.enCurso)
    const ultimas8 = cerradas.slice(-8)
    const totHoras = ultimas8.reduce((s, f) => s + f.personasConHoras, 0)
    const totCerrados = ultimas8.reduce((s, f) => s + f.timesheetsCerrados, 0)
    const diasTodos = cerradas.flatMap((f) => (f.diasCierreMediana != null ? [f.diasCierreMediana] : []))

    // ── Jornadas abiertas ahora mismo (sin límite de ventana) ──
    const abiertas = await prisma.registroHorasCampo.findMany({
      where: { estado: 'iniciado' },
      orderBy: { fechaTrabajo: 'asc' },
      select: { id: true, fechaTrabajo: true, proyecto: { select: { codigo: true } } },
    })

    return NextResponse.json({
      semanas: filas,
      resumen: {
        coberturaTimesheet: totHoras > 0 ? Number(((totCerrados / totHoras) * 100).toFixed(0)) : null,
        personasConHoras: totHoras,
        timesheetsCerrados: totCerrados,
        diasCierreJornadaMediana: mediana(diasTodos),
        jornadasAbiertas: abiertas.length,
      },
      jornadasAbiertas: abiertas.map((j) => ({
        id: j.id,
        proyecto: j.proyecto.codigo,
        fechaTrabajo: j.fechaTrabajo.toISOString().slice(0, 10),
        diasAbierta: Math.max(0, Math.round((hoy.getTime() - j.fechaTrabajo.getTime()) / MS_PER_DAY)),
      })),
    })
  } catch (e) {
    console.error('[GET /api/gestion/puntualidad-registro]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
