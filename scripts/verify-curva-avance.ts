import { prisma } from '@/lib/prisma'
import { serieAvanceRealSemanal, serieConsumoHorasSemanal } from '@/lib/services/avanceHistorico'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { construirCurvaAvance } from '@/lib/utils/curvaAvance'

// Reproduce exactamente lo que hará GET /api/proyectos/[id]/curva-avance, usando el
// servicio y el constructor reales (no una copia). Verificación read-only.

const MS_PER_DAY = 86_400_000
function lunesUTC(d: Date): string {
  const dia = d.getUTCDay()
  const delta = dia === 0 ? -6 : 1 - dia
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base + delta * MS_PER_DAY).toISOString().slice(0, 10)
}

async function main() {
  const codigos = process.argv.slice(2)
  const proyectos = await prisma.proyecto.findMany({
    where: codigos.length > 0 ? { codigo: { in: codigos } } : undefined,
    select: { id: true, codigo: true },
    orderBy: { codigo: 'asc' },
  })

  for (const p of proyectos) {
    const cronoPlan = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: p.id, tipo: 'planificacion', esBaseline: true },
      select: { id: true },
    })
    const tareasPlan = cronoPlan
      ? await prisma.proyectoTarea.findMany({
          where: { proyectoCronogramaId: cronoPlan.id },
          select: {
            fechaInicio: true, fechaFin: true, horasEstimadas: true,
            proyectoEdt: { select: { proyectoFase: { select: { nombre: true } } } },
          },
        })
      : []

    const [snapshots, pesos, serie, consumo] = await Promise.all([
      prisma.proyectoAvanceSnapshot.findMany({
        where: { proyectoId: p.id },
        orderBy: { semanaIso: 'asc' },
        select: { semanaIso: true, fechaCorte: true, progresoGeneral: true },
      }),
      calcularPesosFase(p.id),
      serieAvanceRealSemanal(p.id),
      serieConsumoHorasSemanal(p.id),
    ])

    const curva = construirCurvaAvance(
      tareasPlan.map((t) => ({
        faseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        horasEstimadas: Number(t.horasEstimadas ?? 0),
      })),
      serie.puntos,
      pesos.fases.map((f) => ({ faseNombre: f.nombre, pesoEfectivo: f.pesoEfectivo })),
      snapshots.map((s) => ({ weekStart: lunesUTC(s.fechaCorte), porcentaje: s.progresoGeneral })),
      consumo.puntos,
    )

    const conReal = curva.weeks.filter((w) => w.realAcum != null)
    const brecha = Number((serie.porcentajeActual - serie.porcentajeDerivado).toFixed(2))

    console.log(`\n===== ${p.codigo} =====`)
    console.log(
      `semanas: ${curva.weeks.length} | con Real: ${conReal.length} | ` +
      `baseline: ${curva.hasBaseline ? 'sí' : 'NO'} | reportados: ${snapshots.length}`,
    )
    console.log(
      `derivado ${serie.porcentajeDerivado.toFixed(2)}% vs actual ${serie.porcentajeActual.toFixed(2)}% ` +
      `→ brecha ${brecha.toFixed(2)} pts | histórico en ${serie.tareasConHistorico}/${serie.tareasConAvance} tareas`,
    )
    if (consumo.tieneDatos) {
      const efic = serie.porcentajeActual / ((consumo.horasConsumidas / consumo.horasPresupuestadas) * 100)
      console.log(
        `horas: ${consumo.horasConsumidas.toFixed(0)} de ${consumo.horasPresupuestadas.toFixed(0)} ` +
        `(${((consumo.horasConsumidas / consumo.horasPresupuestadas) * 100).toFixed(1)}%) → eficiencia ${efic.toFixed(2)}`,
      )
    } else console.log('horas: sin registros fechados')
    if (serie.puntos.length === 0) { console.log('  (sin histórico fechado)'); continue }

    // Solo las semanas donde cambia algo, para que quepa.
    const interesantes = curva.weeks.filter(
      (w, i, arr) => w.reportado != null || (w.realAcum != null && (i === 0 || arr[i - 1].realAcum !== w.realAcum)),
    )
    console.table(interesantes.map((w) => ({
      semana: w.weekStart,
      plan: w.planificadoAcum == null ? '—' : `${w.planificadoAcum.toFixed(1)}%`,
      real: w.realAcum == null ? '—' : `${w.realAcum.toFixed(1)}%`,
      horas: w.consumoAcum == null ? '—' : `${w.consumoAcum.toFixed(1)}%`,
      reportado: w.reportado == null ? '—' : `${w.reportado.toFixed(1)}%`,
    })))
  }
}

main().finally(() => prisma.$disconnect())
