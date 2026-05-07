import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const PROYECTO_ID = '60ff07f0-d438-4d2d-b928-cd50741581a9' // INSTALACIONES DE EXTRACTORES

async function main() {
  // Cronograma de ejecución (el más cargado)
  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId: PROYECTO_ID, tipo: 'ejecucion' },
    orderBy: { version: 'desc' },
  })
  if (!cronograma) { console.log('Sin cronograma ejecucion'); return }
  console.log(`Cronograma: "${cronograma.nombre}" v${cronograma.version}\n`)

  // a+b+c: Fases → EDTs → Actividades
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    orderBy: { orden: 'asc' },
  })

  for (const fase of fases) {
    console.log(`\n==== FASE [${fase.orden}]: ${fase.nombre} | ${fase.fechaInicioPlan?.toISOString().slice(0,10) ?? '?'} → ${fase.fechaFinPlan?.toISOString().slice(0,10) ?? '?'} ====`)

    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: cronograma.id, proyectoFaseId: fase.id },
      orderBy: { orden: 'asc' },
      include: {
        proyectoActividad: {
          orderBy: { orden: 'asc' },
          select: { nombre: true, horasPlan: true, orden: true },
        },
      },
    })

    for (const edt of edts) {
      console.log(`\n  EDT: ${edt.nombre}`)
      for (const act of edt.proyectoActividad) {
        console.log(`    → ${act.nombre}  [horasPlan: ${act.horasPlan ?? '-'}]`)
      }
    }
  }

  // d+e: Personal único y horas por recurso
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    include: {
      user: { select: { name: true } },
      recurso: { select: { nombre: true } },
    },
  })

  console.log('\n\n==== PERSONAL ÚNICO ASIGNADO (nombre → recurso/cargo) ====')
  const personaMap = new Map<string, string>()
  const recursoHoras = new Map<string, number>()

  for (const t of tareas) {
    const nombre = t.user?.name ?? 'SIN ASIGNAR'
    const recurso = t.recurso?.nombre ?? 'SIN RECURSO'
    personaMap.set(nombre, recurso)
    const hrs = Number(t.horasEstimadas ?? 0)
    recursoHoras.set(recurso, (recursoHoras.get(recurso) ?? 0) + hrs)
  }

  const personas = [...personaMap.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  for (const [nombre, recurso] of personas) {
    console.log(`  ${nombre.padEnd(30)} → ${recurso}`)
  }

  console.log('\n==== HORAS TOTALES POR RECURSO/CARGO ====')
  const recursosSorted = [...recursoHoras.entries()].sort((a, b) => b[1] - a[1])
  for (const [recurso, horas] of recursosSorted) {
    console.log(`  ${recurso.padEnd(25)} ${horas.toFixed(1).padStart(8)} h`)
  }
  console.log(`  ${'TOTAL'.padEnd(25)} ${[...recursoHoras.values()].reduce((a,b)=>a+b,0).toFixed(1).padStart(8)} h`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
