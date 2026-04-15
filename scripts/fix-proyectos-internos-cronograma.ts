// ===================================================
// 📁 Archivo: fix-proyectos-internos-cronograma.ts
// 📌 Descripción: Crea cronograma de ejecución + EDT "GEN" para proyectos
//    internos que fueron creados antes de que la lógica auto-create existiera.
// ===================================================

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando proyectos internos sin cronograma de ejecución...\n')

  // Obtener todos los proyectos internos
  const proyectosInternos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      proyectoCronograma: {
        where: { tipo: 'ejecucion' },
        select: { id: true, nombre: true }
      }
    },
    orderBy: { codigo: 'asc' }
  })

  console.log(`📋 Total proyectos internos: ${proyectosInternos.length}`)

  const sinCronograma = proyectosInternos.filter(p => p.proyectoCronograma.length === 0)
  const conCronograma = proyectosInternos.filter(p => p.proyectoCronograma.length > 0)

  console.log(`✅ Con cronograma de ejecución: ${conCronograma.length}`)
  conCronograma.forEach(p => console.log(`   - ${p.codigo} — ${p.nombre}`))

  console.log(`\n⚠️  Sin cronograma de ejecución: ${sinCronograma.length}`)
  sinCronograma.forEach(p => console.log(`   - ${p.codigo} — ${p.nombre}`))

  if (sinCronograma.length === 0) {
    console.log('\n✅ Todos los proyectos internos ya tienen cronograma de ejecución. Nada que hacer.')
    return
  }

  console.log('\n🔧 Asegurar que "GEN" existe en catálogo Edt...')
  const edtCatalog = await prisma.edt.upsert({
    where: { nombre: 'GEN' },
    create: { nombre: 'GEN', updatedAt: new Date() },
    update: {}
  })
  console.log(`   ✅ EDT catálogo "GEN" — id: ${edtCatalog.id}`)

  console.log('\n🚀 Creando cronograma de ejecución + EDT GEN para cada proyecto...\n')

  let exitosos = 0
  let fallidos = 0

  for (const proyecto of sinCronograma) {
    try {
      await prisma.$transaction(async (tx) => {
        // Crear cronograma de ejecución
        const cronogramaId = randomUUID()
        await tx.proyectoCronograma.create({
          data: {
            id: cronogramaId,
            proyectoId: proyecto.id,
            tipo: 'ejecucion',
            nombre: 'Ejecución',
            updatedAt: new Date(),
          }
        })

        // Verificar si ya tiene un EDT GEN (por si acaso)
        const edtExistente = await tx.proyectoEdt.findFirst({
          where: { proyectoId: proyecto.id, nombre: 'GEN' }
        })

        if (!edtExistente) {
          await tx.proyectoEdt.create({
            data: {
              id: randomUUID(),
              proyectoId: proyecto.id,
              proyectoCronogramaId: cronogramaId,
              edtId: edtCatalog.id,
              nombre: 'GEN',
              orden: 1,
              updatedAt: new Date(),
            }
          })
        }
      })

      console.log(`   ✅ ${proyecto.codigo} — ${proyecto.nombre}`)
      exitosos++
    } catch (error) {
      console.error(`   ❌ ${proyecto.codigo} — ${proyecto.nombre}: ${error}`)
      fallidos++
    }
  }

  console.log(`\n📊 Resultado:`)
  console.log(`   ✅ Exitosos: ${exitosos}`)
  if (fallidos > 0) console.log(`   ❌ Fallidos: ${fallidos}`)
  console.log('\n✅ Script completado.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
