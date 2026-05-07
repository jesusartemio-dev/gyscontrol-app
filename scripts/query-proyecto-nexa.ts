// Script de solo lectura — consulta datos del cronograma del proyecto NEXA
// Uso: npx dotenv -e .env.production -o -- npx tsx scripts/query-proyecto-nexa.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Buscar proyecto NEXA
  const proyecto = await prisma.proyecto.findFirst({
    where: { nombre: { contains: 'NEXA', mode: 'insensitive' } },
    include: { cliente: { select: { nombre: true } } },
  })

  if (!proyecto) {
    console.log('No se encontró proyecto con "NEXA" en el nombre.')
    return
  }

  console.log('\n=== PROYECTO ===')
  console.log(`ID:      ${proyecto.id}`)
  console.log(`Nombre:  ${proyecto.nombre}`)
  console.log(`Estado:  ${proyecto.estado}`)
  console.log(`Cliente: ${proyecto.cliente?.nombre ?? 'N/A'}`)

  // 2. Cronograma
  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId: proyecto.id },
    orderBy: { version: 'desc' },
  })

  if (!cronograma) {
    console.log('\nSin cronograma cargado.')
    return
  }

  console.log('\n=== CRONOGRAMA ===')
  console.log(`ID:      ${cronograma.id}`)
  console.log(`Nombre:  ${cronograma.nombre}`)
  console.log(`Tipo:    ${cronograma.tipo}`)
  console.log(`Versión: ${cronograma.version}`)

  // 3. Conteos
  const [nFases, nEdts, nActividades, nTareas] = await Promise.all([
    prisma.proyectoFase.count({ where: { proyectoCronogramaId: cronograma.id } }),
    prisma.proyectoEdt.count({ where: { proyectoCronogramaId: cronograma.id } }),
    prisma.proyectoActividad.count({ where: { proyectoCronogramaId: cronograma.id } }),
    prisma.proyectoTarea.count({ where: { proyectoCronogramaId: cronograma.id } }),
  ])

  console.log('\n=== ESTRUCTURA (conteos) ===')
  console.log(`Fases:       ${nFases}`)
  console.log(`EDTs:        ${nEdts}`)
  console.log(`Actividades: ${nActividades}`)
  console.log(`Tareas:      ${nTareas}`)

  // 4. Fases
  if (nFases > 0) {
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      orderBy: { orden: 'asc' },
    })
    console.log('\n=== FASES ===')
    for (const f of fases) {
      console.log(`  [${f.orden}] ${f.nombre} | ${f.estado} | ${f.fechaInicioPlan?.toISOString().slice(0,10) ?? '?'} → ${f.fechaFinPlan?.toISOString().slice(0,10) ?? '?'}`)
    }
  }

  // 5. Muestra de actividades (4 filas)
  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    include: {
      user: { select: { name: true } },
      proyectoEdt: { select: { nombre: true } },
      proyectoTarea: { select: { id: true } },
    },
    orderBy: { orden: 'asc' },
    take: 4,
  })

  console.log('\n=== MUESTRA DE ACTIVIDADES (primeras 4) ===')
  for (const a of actividades) {
    console.log(`  Nombre:      ${a.nombre}`)
    console.log(`  EDT padre:   ${a.proyectoEdt.nombre}`)
    console.log(`  Fechas:      ${a.fechaInicioPlan.toISOString().slice(0,10)} → ${a.fechaFinPlan.toISOString().slice(0,10)}`)
    console.log(`  HorasPlan:   ${a.horasPlan ?? 'null'}`)
    console.log(`  Responsable: ${a.user?.name ?? 'sin asignar'}`)
    console.log(`  Tareas hijas:${a.proyectoTarea.length}`)
    console.log()
  }

  // 6. Muestra de tareas (4 filas)
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    include: {
      user: { select: { name: true } },
      recurso: { select: { nombre: true } },
      proyectoActividad: { select: { nombre: true } },
    },
    orderBy: { orden: 'asc' },
    take: 4,
  })

  console.log('=== MUESTRA DE TAREAS (primeras 4) ===')
  for (const t of tareas) {
    console.log(`  Nombre:           ${t.nombre}`)
    console.log(`  Actividad padre:  ${t.proyectoActividad?.nombre ?? 'ninguna'}`)
    console.log(`  Fechas:           ${t.fechaInicio.toISOString().slice(0,10)} → ${t.fechaFin.toISOString().slice(0,10)}`)
    console.log(`  HorasEstimadas:   ${t.horasEstimadas ?? 'null'}`)
    console.log(`  PersonasEstimadas:${t.personasEstimadas}`)
    console.log(`  Responsable:      ${t.user?.name ?? 'sin asignar'}`)
    console.log(`  Recurso:          ${t.recurso?.nombre ?? 'sin recurso'}`)
    console.log()
  }

  // 7. Tareas con recurso asignado (muestra disponibilidad de ese dato)
  const tareasConRecurso = await prisma.proyectoTarea.count({
    where: { proyectoCronogramaId: cronograma.id, recursoId: { not: null } },
  })
  const tareasConResponsable = await prisma.proyectoTarea.count({
    where: { proyectoCronogramaId: cronograma.id, responsableId: { not: null } },
  })
  const actividadesConResponsable = await prisma.proyectoActividad.count({
    where: { proyectoCronogramaId: cronograma.id, responsableId: { not: null } },
  })

  console.log('=== COBERTURA DE DATOS ===')
  console.log(`Tareas con recurso asignado:         ${tareasConRecurso} / ${nTareas}`)
  console.log(`Tareas con responsable (user):       ${tareasConResponsable} / ${nTareas}`)
  console.log(`Actividades con responsable (user):  ${actividadesConResponsable} / ${nActividades}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
