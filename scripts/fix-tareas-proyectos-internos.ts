/**
 * Fix: marcar como esExtra=true todas las tareas de proyectos internos.
 * Los proyectos internos no tienen cronograma formal, todas sus tareas son Extra.
 *
 * Uso local:    npx tsx scripts/fix-tareas-proyectos-internos.ts
 * Uso prod:     npx dotenv -e .env.production -- npx tsx scripts/fix-tareas-proyectos-internos.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando proyectos internos...')

  const proyectosInternos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    select: { id: true, codigo: true, nombre: true },
  })

  console.log(`📦 Proyectos internos encontrados: ${proyectosInternos.length}`)
  for (const p of proyectosInternos) {
    console.log(`  - ${p.codigo}: ${p.nombre}`)
  }

  if (proyectosInternos.length === 0) {
    console.log('✅ No hay proyectos internos. Nada que corregir.')
    return
  }

  const ids = proyectosInternos.map(p => p.id)

  // Buscar tareas de proyectos internos que NO sean esExtra
  const tareasAfectadas = await prisma.proyectoTarea.count({
    where: {
      proyectoEdt: { proyectoCronograma: { proyectoId: { in: ids } } },
      esExtra: false,
    },
  })

  console.log(`\n⚠️  Tareas con esExtra=false en proyectos internos: ${tareasAfectadas}`)

  if (tareasAfectadas === 0) {
    console.log('✅ Todas las tareas de proyectos internos ya tienen esExtra=true.')
    return
  }

  console.log('\n🔧 Corrigiendo...')
  const resultado = await prisma.proyectoTarea.updateMany({
    where: {
      proyectoEdt: { proyectoCronograma: { proyectoId: { in: ids } } },
      esExtra: false,
    },
    data: {
      esExtra: true,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ Tareas corregidas: ${resultado.count}`)
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
