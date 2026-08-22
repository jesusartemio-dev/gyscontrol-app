import { prisma } from '@/lib/prisma'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { serieAvanceRealSemanal, serieConsumoHorasSemanal } from '@/lib/services/avanceHistorico'
import { diagnosticarPreparacion } from '@/lib/services/preparacionCronograma'

// Reproduce GET /api/gestion/cartera-avance con los servicios reales. Read-only.

async function main() {
  const incluirCerrados = process.argv.includes('--cerrados')
  const tipo = process.argv.includes('--internos') ? 'interno'
    : process.argv.includes('--todos') ? 'todos' : 'cliente'
  const proyectos = await prisma.proyecto.findMany({
    where: {
      ...(incluirCerrados ? {} : { estado: { not: 'cerrado' as const } }),
      ...(tipo === 'todos' ? {} : { esInterno: tipo === 'interno' }),
    },
    select: { id: true, codigo: true, estado: true },
    orderBy: { codigo: 'asc' },
  })
  console.log(`tipo=${tipo}  cerrados=${incluirCerrados}
`)
  const abiertas = await prisma.registroHorasCampo.findMany({
    where: { estado: 'iniciado' }, select: { proyectoId: true },
  })
  const abiertasPorProyecto = new Map<string, number>()
  for (const j of abiertas) abiertasPorProyecto.set(j.proyectoId, (abiertasPorProyecto.get(j.proyectoId) ?? 0) + 1)

  const t0 = Date.now()
  const filas = []
  for (const p of proyectos) {
    const pesos = await calcularPesosFase(p.id)
    const [serie, consumo, prep] = await Promise.all([
      serieAvanceRealSemanal(p.id, pesos),
      serieConsumoHorasSemanal(p.id),
      diagnosticarPreparacion(p.id),
    ])
    const pctH = consumo.horasPresupuestadas > 0
      ? (consumo.horasConsumidas / consumo.horasPresupuestadas) * 100 : null
    filas.push({
      proyecto: p.codigo,
      avance: prep.listo ? `${serie.porcentajeDerivado.toFixed(1)}%` : '—',
      semanas: serie.puntos.length || '—',
      horas: pctH == null ? '—' : `${pctH.toFixed(0)}%`,
      'fuera plan': pesos.fueraDePlan.tareas
        ? `${pesos.fueraDePlan.tareas} · ${pesos.fueraDePlan.porcentajeSobrePlan.toFixed(0)}%` : '—',
      eficiencia: pctH && pctH > 0 ? (serie.porcentajeActual / pctH).toFixed(2) : '—',
      atencion: [
        prep.estado === 'centro_de_costo' ? 'centro de costo' : !prep.listo ? 'sin armar' : '',
        prep.listo && !prep.puedeCompararConPlan ? 'sin plan' : '',
        serie.porcentajeActual - serie.porcentajeDerivado > 1 ? 'sin fechar' : '',
        abiertasPorProyecto.get(p.id) ? `${abiertasPorProyecto.get(p.id)} jorn.` : '',
      ].filter(Boolean).join(' · '),
    })
  }
  console.table(filas)
  console.log(`\n${proyectos.length} proyectos en ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
