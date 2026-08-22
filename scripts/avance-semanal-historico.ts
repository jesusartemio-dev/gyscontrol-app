import { prisma } from '@/lib/prisma'
import { serieAvanceRealSemanal } from '@/lib/services/avanceHistorico'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { construirCurvaAvance } from '@/lib/utils/curvaAvance'
import { formatearSemanaIso } from '@/lib/utils/isoWeek'
import { writeFileSync } from 'fs'

/**
 * Avance real acumulado, semana a semana, reconstruido del avance fechado.
 * Read-only. Genera tabla en consola + CSV.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/avance-semanal-historico.ts [CODIGO...]
 */

const MS = 86_400_000
function lunesUTC(d: Date): string {
  const dia = d.getUTCDay()
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base + (dia === 0 ? -6 : 1 - dia) * MS).toISOString().slice(0, 10)
}
const domingoDe = (lunes: string) =>
  new Date(Date.parse(`${lunes}T00:00:00Z`) + 6 * MS).toISOString().slice(0, 10)

async function main() {
  const codigos = process.argv.slice(2)
  const proyectos = await prisma.proyecto.findMany({
    where: codigos.length ? { codigo: { in: codigos } } : undefined,
    select: { id: true, codigo: true, nombre: true, estado: true },
    orderBy: { codigo: 'asc' },
  })

  const csv: string[] = ['proyecto,semanaIso,desde,hasta,realAcum,incremento,planAcum,desviacion']

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

    const [snaps, pesos, serie] = await Promise.all([
      prisma.proyectoAvanceSnapshot.findMany({
        where: { proyectoId: p.id }, select: { fechaCorte: true, progresoGeneral: true },
      }),
      calcularPesosFase(p.id),
      serieAvanceRealSemanal(p.id),
    ])
    if (!serie.tieneHistorico) continue

    const curva = construirCurvaAvance(
      tareasPlan.map((t) => ({
        faseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
        fechaInicio: t.fechaInicio, fechaFin: t.fechaFin,
        horasEstimadas: Number(t.horasEstimadas ?? 0),
      })),
      serie.puntos,
      pesos.fases.map((f) => ({ faseNombre: f.nombre, pesoEfectivo: f.pesoEfectivo })),
      snaps.map((s) => ({ weekStart: lunesUTC(s.fechaCorte), porcentaje: s.progresoGeneral })),
    )

    // Solo el tramo con dato real: antes de la primera semana no hay nada que contar, y
    // después de la semana en curso la curva ya no arrastra (no se afirma nada del futuro).
    const desdeIdx = curva.weeks.findIndex((w) => w.realAcum != null)
    if (desdeIdx < 0) continue
    let hastaIdx = curva.weeks.length - 1
    while (hastaIdx >= 0 && curva.weeks[hastaIdx].realAcum == null) hastaIdx--
    const tramo = curva.weeks.slice(desdeIdx, hastaIdx + 1)

    console.log(`\n${'='.repeat(76)}`)
    console.log(`${p.codigo} — ${p.nombre}   [${p.estado}]`)
    console.log('='.repeat(76))

    let previo = 0
    const filas = tramo.map((w) => {
      const real = w.realAcum ?? 0
      const inc = Number((real - previo).toFixed(2))
      previo = real
      const desv = w.planificadoAcum != null ? Number((real - w.planificadoAcum).toFixed(1)) : null
      const semanaIso = formatearSemanaIso(new Date(`${w.weekStart}T12:00:00Z`))
      csv.push([
        p.codigo, semanaIso, w.weekStart, domingoDe(w.weekStart),
        real.toFixed(2), inc.toFixed(2),
        w.planificadoAcum?.toFixed(2) ?? '', desv?.toFixed(1) ?? '',
      ].join(','))
      return {
        semana: semanaIso,
        desde: w.weekStart.slice(5),
        hasta: domingoDe(w.weekStart).slice(5),
        'real acum': `${real.toFixed(1)}%`,
        'avanzó': inc > 0.005 ? `+${inc.toFixed(1)}` : inc < -0.005 ? inc.toFixed(1) : '—',
        plan: w.planificadoAcum != null ? `${w.planificadoAcum.toFixed(1)}%` : '—',
        'vs plan': desv == null ? '—' : desv >= 0 ? `+${desv}` : `${desv}`,
      }
    })
    console.table(filas)
  }

  const ruta = 'avance-semanal-historico.csv'
  writeFileSync(ruta, csv.join('\n'), 'utf-8')
  console.log(`\n📄 CSV: ${ruta}  (${csv.length - 1} filas)`)
  console.log('\nNota: las semanas anteriores a que existiera el registro fechado se')
  console.log('reconstruyeron en el backfill, ubicando el % de cada tarea en su mejor fecha')
  console.log('disponible (cierre real u horas imputadas). Son una reconstrucción, no lo que')
  console.log('alguien declaró en su momento.')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
