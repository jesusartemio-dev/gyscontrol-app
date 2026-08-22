import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirCurvaAvance } from '@/lib/utils/curvaAvance'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { serieAvanceRealSemanal, serieConsumoHorasSemanal } from '@/lib/services/avanceHistorico'
import { diagnosticarPreparacion } from '@/lib/services/preparacionCronograma'
import { formatearSemanaIso } from '@/lib/utils/isoWeek'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const MS_PER_DAY = 86_400_000

/** Lunes (UTC) de la semana ISO de una fecha, como "YYYY-MM-DD". */
function lunesUTC(d: Date): string {
  const dia = d.getUTCDay()
  const delta = dia === 0 ? -6 : 1 - dia
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base + delta * MS_PER_DAY).toISOString().slice(0, 10)
}

/**
 * GET /api/proyectos/[id]/curva-avance
 * Curva S de avance físico (% 0-100). Read-only, sin params extra.
 *  - Planeado: baseline del cronograma de planificación.
 *  - Real: derivado del histórico fechado (ProyectoTareaAvance), recalculado en cada
 *    consulta — una jornada cerrada tarde corrige la semana a la que pertenece.
 *  - Reportado: los snapshots congelados, como puntos sueltos.
 * No toca la curva de costos.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, codigo: true, nombre: true },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Cronograma planificacion (esBaseline) para el plan; ejecucion solo como metadato.
    const cronoPlan = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'planificacion', esBaseline: true },
      select: { id: true },
    })
    const cronoEjec = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: id, tipo: 'ejecucion' },
      select: { id: true },
    })

    const tareasPlan = cronoPlan
      ? await prisma.proyectoTarea.findMany({
          where: { proyectoCronogramaId: cronoPlan.id },
          select: {
            fechaInicio: true,
            fechaFin: true,
            horasEstimadas: true,
            proyectoEdt: { select: { proyectoFase: { select: { nombre: true } } } },
          },
        })
      : []

    const [snapshots, pesos, serie, consumo, preparacion] = await Promise.all([
      prisma.proyectoAvanceSnapshot.findMany({
        where: { proyectoId: id },
        orderBy: { semanaIso: 'asc' },
        select: { semanaIso: true, fechaCorte: true, progresoGeneral: true },
      }),
      calcularPesosFase(id),
      serieAvanceRealSemanal(id),
      serieConsumoHorasSemanal(id),
      diagnosticarPreparacion(id),
    ])

    const baselineTareas = tareasPlan.map((t) => ({
      faseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      horasEstimadas: Number(t.horasEstimadas ?? 0),
    }))
    const pesosFase = pesos.fases.map((f) => ({ faseNombre: f.nombre, pesoEfectivo: f.pesoEfectivo }))
    const reportados = snapshots.map((s) => ({
      weekStart: lunesUTC(s.fechaCorte),
      porcentaje: s.progresoGeneral,
    }))

    const curva = construirCurvaAvance(baselineTareas, serie.puntos, pesosFase, reportados, consumo.puntos)

    // Si el histórico se queda muy por debajo del avance actual es que hay tareas que
    // avanzaron antes de que existiera el registro fechado: la curva arranca demasiado
    // abajo hasta que se haga el backfill del punto cero.
    const brechaHistorico = Number((serie.porcentajeActual - serie.porcentajeDerivado).toFixed(2))

    // Jornadas todavía abiertas: su avance aún no existe, y pertenece a semanas pasadas.
    const jornadasAbiertas = await prisma.registroHorasCampo.findMany({
      where: { proyectoId: id, estado: 'iniciado' },
      orderBy: { fechaTrabajo: 'asc' },
      select: { id: true, fechaTrabajo: true },
    })

    return NextResponse.json({
      weeks: curva.weeks,
      hasBaseline: curva.hasBaseline,
      tieneSerieReal: curva.tieneSerieReal,
      tieneReportados: curva.tieneReportados,
      cronogramaPlanId: cronoPlan?.id ?? null,
      cronogramaEjecId: cronoEjec?.id ?? null,
      proyecto,
      preparacion,
      historico: {
        porcentajeActual: serie.porcentajeActual,
        porcentajeDerivado: serie.porcentajeDerivado,
        brecha: brechaHistorico,
        tareasConAvance: serie.tareasConAvance,
        tareasConHistorico: serie.tareasConHistorico,
      },
      // Trabajo ejecutado que no estaba en el alcance: no cuenta para el %, pero sus horas
      // sí pesan en el consumo. Es el crecimiento de alcance del proyecto.
      fueraDePlan: pesos.fueraDePlan,
      consumo: {
        tieneDatos: consumo.tieneDatos,
        horasPresupuestadas: Number(consumo.horasPresupuestadas.toFixed(1)),
        horasConsumidas: Number(consumo.horasConsumidas.toFixed(1)),
        // Eficiencia: puntos de avance por punto de horas gastado. < 1 = se está gastando
        // más rápido de lo que se avanza.
        eficiencia:
          consumo.horasPresupuestadas > 0 && consumo.horasConsumidas > 0
            ? Number(
                (serie.porcentajeActual /
                  ((consumo.horasConsumidas / consumo.horasPresupuestadas) * 100)).toFixed(2),
              )
            : null,
      },
      jornadasAbiertas: jornadasAbiertas.map((j) => ({
        id: j.id,
        fechaTrabajo: j.fechaTrabajo.toISOString().slice(0, 10),
        semanaIso: formatearSemanaIso(j.fechaTrabajo),
      })),
      snapshots: snapshots.map((s) => ({ semanaIso: s.semanaIso, progresoGeneral: s.progresoGeneral })),
    })
  } catch (e) {
    console.error('[GET /api/proyectos/[id]/curva-avance]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
