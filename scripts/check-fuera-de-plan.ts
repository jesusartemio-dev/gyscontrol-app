import { prisma } from '@/lib/prisma'
import { calcularPesosFase } from '@/lib/services/pesoFase'

// Comprueba el resumen de trabajo fuera del plan por proyecto. Read-only.

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    select: { id: true, codigo: true },
    orderBy: { codigo: 'asc' },
  })
  const filas = []
  for (const p of proyectos) {
    const f = (await calcularPesosFase(p.id)).fueraDePlan
    if (f.tareas === 0) continue
    filas.push({
      proyecto: p.codigo,
      tareas: f.tareas,
      'hh extras': f.horasHombre,
      'h reales': f.horasReales,
      '% sobre plan': f.sinAlcancePlanificado ? 'TODO' : `${f.porcentajeSobrePlan}%`,
      'sin alcance planificado': f.sinAlcancePlanificado ? 'sí' : '',
    })
  }
  console.table(filas)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
