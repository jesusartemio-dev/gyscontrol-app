import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const NEXA_CLIENT_ID = 'cli-import-1769535277176-etemtnw60'
const NEXA_PROJECT_IDS = [
  '6ed7b186-2048-4d8e-9908-2df575e11a9c',
  '09f97c6c-52b6-44de-933f-a14c43604064',
  'a0cb6242-85fe-4c70-815d-364e69edc8be',
  '7bde0152-a631-490c-b6ac-f0fc44c5751e',
  'c8f6ffa8-93bb-438f-8f33-3dd8144da24d',
  '8c7a1e18-d714-490c-b300-cac3624097bc',
  '60ff07f0-d438-4d2d-b928-cd50741581a9',
]

async function main() {
  // Find all cronogramas for NEXA projects
  const cronogramas = await prisma.proyectoCronograma.findMany({
    where: { proyectoId: { in: NEXA_PROJECT_IDS } },
    include: { proyecto: { select: { nombre: true, estado: true } } },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`\nCronogramas de proyectos NEXA: ${cronogramas.length}`)
  for (const c of cronogramas) {
    const [nFases, nEdts, nActs, nTareas] = await Promise.all([
      prisma.proyectoFase.count({ where: { proyectoCronogramaId: c.id } }),
      prisma.proyectoEdt.count({ where: { proyectoCronogramaId: c.id } }),
      prisma.proyectoActividad.count({ where: { proyectoCronogramaId: c.id } }),
      prisma.proyectoTarea.count({ where: { proyectoCronogramaId: c.id } }),
    ])
    console.log(`\n  Proyecto: ${c.proyecto.nombre} [${c.proyecto.estado}]`)
    console.log(`  Cronograma: ${c.nombre} (v${c.version}) | tipo: ${c.tipo}`)
    console.log(`  Fases:${nFases}  EDTs:${nEdts}  Acts:${nActs}  Tareas:${nTareas}`)
  }

  // Detail the most loaded cronograma
  const loaded = cronogramas.find(c => true) // pick first, or pick by count
  if (!loaded) { console.log('\nNo hay cronogramas.'); return }

  // Fases
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: loaded.id },
    orderBy: { orden: 'asc' },
  })
  console.log(`\n=== FASES del cronograma "${loaded.nombre}" ===`)
  for (const f of fases) {
    console.log(`  [${f.orden}] ${f.nombre} | ${f.estado} | ${f.fechaInicioPlan?.toISOString().slice(0,10) ?? '?'} → ${f.fechaFinPlan?.toISOString().slice(0,10) ?? '?'}`)
  }

  // Sample actividades
  const acts = await prisma.proyectoActividad.findMany({
    where: { proyectoCronogramaId: loaded.id },
    include: {
      user: { select: { name: true } },
      proyectoEdt: { select: { nombre: true } },
      proyectoTarea: { select: { id: true } },
    },
    orderBy: { orden: 'asc' },
    take: 5,
  })
  console.log('\n=== MUESTRA ACTIVIDADES (5) ===')
  for (const a of acts) {
    console.log(`  ${a.nombre}`)
    console.log(`    EDT: ${a.proyectoEdt.nombre} | ${a.fechaInicioPlan.toISOString().slice(0,10)} → ${a.fechaFinPlan.toISOString().slice(0,10)} | hrs:${a.horasPlan ?? '-'} | resp:${a.user?.name ?? 'n/a'} | tareas:${a.proyectoTarea.length}`)
  }

  // Sample tareas
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: loaded.id },
    include: {
      user: { select: { name: true } },
      recurso: { select: { nombre: true } },
      proyectoActividad: { select: { nombre: true } },
    },
    orderBy: { orden: 'asc' },
    take: 5,
  })
  console.log('\n=== MUESTRA TAREAS (5) ===')
  for (const t of tareas) {
    console.log(`  ${t.nombre}`)
    console.log(`    Act: ${t.proyectoActividad?.nombre ?? '-'} | ${t.fechaInicio.toISOString().slice(0,10)} → ${t.fechaFin.toISOString().slice(0,10)} | hrs:${t.horasEstimadas ?? '-'} | personas:${t.personasEstimadas} | resp:${t.user?.name ?? 'n/a'} | recurso:${t.recurso?.nombre ?? 'n/a'}`)
  }

  // Coverage
  const totalActs = await prisma.proyectoActividad.count({ where: { proyectoCronogramaId: loaded.id } })
  const totalTareas = await prisma.proyectoTarea.count({ where: { proyectoCronogramaId: loaded.id } })
  const [actsConResp, tareasConResp, tareasConRecurso, tareasConHrs] = await Promise.all([
    prisma.proyectoActividad.count({ where: { proyectoCronogramaId: loaded.id, responsableId: { not: null } } }),
    prisma.proyectoTarea.count({ where: { proyectoCronogramaId: loaded.id, responsableId: { not: null } } }),
    prisma.proyectoTarea.count({ where: { proyectoCronogramaId: loaded.id, recursoId: { not: null } } }),
    prisma.proyectoTarea.count({ where: { proyectoCronogramaId: loaded.id, horasEstimadas: { not: null } } }),
  ])
  console.log('\n=== COBERTURA ===')
  console.log(`  Actividades con responsable: ${actsConResp}/${totalActs}`)
  console.log(`  Tareas con responsable:      ${tareasConResp}/${totalTareas}`)
  console.log(`  Tareas con recurso:          ${tareasConRecurso}/${totalTareas}`)
  console.log(`  Tareas con horas estimadas:  ${tareasConHrs}/${totalTareas}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
