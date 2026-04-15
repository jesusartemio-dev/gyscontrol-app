// ===================================================
// 📁 Archivo: fix-tarea-trabajo-general.ts
// 📌 Descripción: Crea tarea "Trabajo General" en proyectos internos que no la tienen.
//    Solo afecta proyectos con EDT GEN pero sin esa tarea.
// ===================================================

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando proyectos internos sin tarea "Trabajo General"...\n')

  const proyectos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    include: {
      proyectoCronograma: {
        where: { tipo: 'ejecucion' },
        include: {
          proyectoEdt: {
            where: { nombre: 'GEN' },
            include: {
              proyectoTarea: {
                where: { nombre: 'Trabajo General' },
                select: { id: true }
              }
            }
          }
        }
      }
    },
    orderBy: { codigo: 'asc' }
  })

  const sinTarea = proyectos.filter(p => {
    const cron = p.proyectoCronograma[0]
    const edt = cron?.proyectoEdt[0]
    return edt && edt.proyectoTarea.length === 0
  })

  const conTarea = proyectos.filter(p => {
    const cron = p.proyectoCronograma[0]
    const edt = cron?.proyectoEdt[0]
    return edt && edt.proyectoTarea.length > 0
  })

  console.log(`✅ Ya tienen "Trabajo General": ${conTarea.length}`)
  conTarea.forEach(p => console.log(`   - ${p.codigo} — ${p.nombre}`))

  console.log(`\n⚠️  Sin "Trabajo General": ${sinTarea.length}`)
  sinTarea.forEach(p => console.log(`   - ${p.codigo} — ${p.nombre}`))

  if (sinTarea.length === 0) {
    console.log('\n✅ Todos los proyectos internos ya tienen "Trabajo General". Nada que hacer.')
    return
  }

  console.log('\n🚀 Creando tarea "Trabajo General" en los proyectos faltantes...\n')

  let exitosos = 0
  let fallidos = 0

  for (const p of sinTarea) {
    const cron = p.proyectoCronograma[0]
    const edt = cron?.proyectoEdt[0]
    if (!cron || !edt) {
      console.error(`   ❌ ${p.codigo}: sin cronograma o EDT GEN — saltar`)
      fallidos++
      continue
    }

    try {
      const fechaInicio = p.fechaInicio ?? new Date()
      const fechaFin = new Date(fechaInicio)
      fechaFin.setFullYear(fechaFin.getFullYear() + 1)

      await prisma.proyectoTarea.create({
        data: {
          id: randomUUID(),
          proyectoEdtId: edt.id,
          proyectoCronogramaId: cron.id,
          nombre: 'Trabajo General',
          descripcion: '[EXTRA]',
          fechaInicio,
          fechaFin,
          horasEstimadas: 9999,
          personasEstimadas: 1,
          estado: 'en_progreso',
          prioridad: 'media',
          orden: 0,
          updatedAt: new Date(),
        }
      })

      console.log(`   ✅ ${p.codigo} — ${p.nombre}`)
      exitosos++
    } catch (error) {
      console.error(`   ❌ ${p.codigo} — ${p.nombre}: ${error}`)
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
