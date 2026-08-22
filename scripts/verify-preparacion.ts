import { prisma } from '@/lib/prisma'
import { diagnosticarPreparacion } from '@/lib/services/preparacionCronograma'
import { serieConsumoHorasSemanal, serieAvanceRealSemanal } from '@/lib/services/avanceHistorico'

// Verifica el diagnóstico de preparación y el efecto de excluir jornadas abiertas
// del consumo de horas. Read-only.

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    select: { id: true, codigo: true, estado: true },
    orderBy: { codigo: 'asc' },
  })

  const filas = []
  for (const p of proyectos) {
    const d = await diagnosticarPreparacion(p.id)
    filas.push({
      proyecto: p.codigo,
      estadoProy: p.estado,
      diagnostico: d.estado,
      'curva Real': d.listo ? 'sí' : 'NO',
      'curva Plan': d.puedeCompararConPlan ? 'sí' : 'NO',
      tareas: d.tareasEjecucion,
      titulo: d.titulo,
    })
  }
  console.log('=== DIAGNÓSTICO DE PREPARACIÓN (lo que verá cada proyecto) ===\n')
  console.table(filas)

  console.log('\n=== CONSUMO DE HORAS: proyectos con jornadas abiertas ===')
  for (const codigo of ['CJM45', 'CJM47', 'CJM48', 'QRM15', 'QRM16']) {
    const p = proyectos.find((x) => x.codigo === codigo)
    if (!p) continue
    const [c, s] = await Promise.all([serieConsumoHorasSemanal(p.id), serieAvanceRealSemanal(p.id)])
    const pct = c.horasPresupuestadas > 0 ? (c.horasConsumidas / c.horasPresupuestadas) * 100 : 0
    console.log(
      `${codigo}: ${c.horasConsumidas.toFixed(1)} de ${c.horasPresupuestadas.toFixed(0)} h ` +
      `(${pct.toFixed(1)}%) · avance ${s.porcentajeActual.toFixed(1)}% · ` +
      `eficiencia ${pct > 0 ? (s.porcentajeActual / pct).toFixed(2) : '—'}`,
    )
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
