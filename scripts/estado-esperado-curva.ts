import { prisma } from '@/lib/prisma'
import { serieAvanceRealSemanal, serieConsumoHorasSemanal } from '@/lib/services/avanceHistorico'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { construirCurvaAvance } from '@/lib/utils/curvaAvance'

// Estado que la curva debería mostrar HOY en cada proyecto. Read-only.

const MS = 86_400_000
function lunesUTC(d: Date): string {
  const dia = d.getUTCDay()
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return new Date(base + (dia === 0 ? -6 : 1 - dia) * MS).toISOString().slice(0, 10)
}

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    where: { estado: { notIn: ['cerrado'] } },
    select: { id: true, codigo: true, estado: true },
    orderBy: { codigo: 'asc' },
  })

  const filas = []
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

    const [snaps, pesos, serie, consumo, abiertas] = await Promise.all([
      prisma.proyectoAvanceSnapshot.findMany({
        where: { proyectoId: p.id }, select: { fechaCorte: true, progresoGeneral: true },
      }),
      calcularPesosFase(p.id),
      serieAvanceRealSemanal(p.id),
      serieConsumoHorasSemanal(p.id),
      prisma.registroHorasCampo.findMany({
        where: { proyectoId: p.id, estado: 'iniciado' },
        select: { fechaTrabajo: true },
        orderBy: { fechaTrabajo: 'asc' },
      }),
    ])

    const curva = construirCurvaAvance(
      tareasPlan.map((t) => ({
        faseNombre: t.proyectoEdt?.proyectoFase?.nombre ?? null,
        fechaInicio: t.fechaInicio, fechaFin: t.fechaFin,
        horasEstimadas: Number(t.horasEstimadas ?? 0),
      })),
      serie.puntos,
      pesos.fases.map((f) => ({ faseNombre: f.nombre, pesoEfectivo: f.pesoEfectivo })),
      snaps.map((s) => ({ weekStart: lunesUTC(s.fechaCorte), porcentaje: s.progresoGeneral })),
      consumo.puntos,
    )

    if (curva.weeks.length === 0 && !serie.tieneHistorico) continue

    const conReal = curva.weeks.filter((w) => w.realAcum != null).length
    const pctHoras = consumo.horasPresupuestadas > 0
      ? (consumo.horasConsumidas / consumo.horasPresupuestadas) * 100 : 0

    filas.push({
      proyecto: p.codigo,
      estado: p.estado,
      'línea Plan': curva.hasBaseline ? 'sí' : 'NO',
      'sem. con Real': `${conReal}/${curva.weeks.length}`,
      'Real hoy': `${serie.porcentajeDerivado.toFixed(1)}%`,
      brecha: serie.porcentajeActual - serie.porcentajeDerivado > 1
        ? `⚠ ${(serie.porcentajeActual - serie.porcentajeDerivado).toFixed(1)}` : 'ok',
      'Horas %': consumo.tieneDatos ? `${pctHoras.toFixed(0)}%` : '—',
      'fuera de plan': pesos.fueraDePlan.tareas > 0
        ? `${pesos.fueraDePlan.tareas} (${pesos.fueraDePlan.porcentajeSobrePlan.toFixed(0)}%)` : '',
      eficiencia: consumo.tieneDatos && pctHoras > 0
        ? (serie.porcentajeActual / pctHoras).toFixed(2) : '—',
      reportados: snaps.length || '',
      'jornadas abiertas': abiertas.length
        ? abiertas.map((j) => j.fechaTrabajo.toISOString().slice(5, 10)).join(' ')
        : '',
    })
  }

  console.log('=== ESTADO QUE DEBE MOSTRAR LA CURVA S HOY (proyectos no cerrados) ===\n')
  console.table(filas)
  console.log('\nLeyenda:')
  console.log('  línea Plan "NO"  → el proyecto no tiene cronograma de planificación marcado')
  console.log('                     como línea base; la curva azul no se dibuja (es correcto).')
  console.log('  brecha ⚠         → hay avance sin fecha registrada; la app lo avisa en pantalla.')
  console.log('  eficiencia < 1   → se están gastando más horas de las que se avanza.')
  console.log('  jornadas abiertas→ esas fechas corregirán su semana al cerrarse.')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
