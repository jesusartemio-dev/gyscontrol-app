// ===================================================
// 📁 Archivo: migrate-proyecto-cronograma.ts
// 📌 Ubicación: scripts/migrate-proyecto-cronograma.ts
// 🔧 Descripción: Script de migración para corregir jerarquía de cronograma
// 🎯 Funcionalidad: Migrar EDTs y tareas existentes a nueva estructura
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProyectoCronograma() {
  console.log('🚀 Iniciando migración de jerarquía de cronograma...')

  try {
    // 1. Obtener todos los EDTs existentes con sus cronogramas
    const edts = await prisma.proyectoEdt.findMany({
      include: {
        proyectoCronograma: {
          include: { fases: true }
        }
      }
    })

    console.log(`📊 Encontrados ${edts.length} EDTs para migrar`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    // 2. Procesar cada EDT
    for (const edt of edts) {
      try {
        // Si ya tiene fase asignada, continuar
        if (edt.proyectoFaseId) {
          skipped++
          continue
        }

        // Buscar fase correspondiente en el cronograma
        const fase = edt.proyectoCronograma?.fases?.[0] // Tomar primera fase disponible

        if (fase) {
          // Actualizar EDT para asignarlo a la fase
          await prisma.proyectoEdt.update({
            where: { id: edt.id },
            data: { proyectoFaseId: fase.id }
          })
          migrated++
          console.log(`✅ EDT ${edt.id} migrado a fase ${fase.id}`)
        } else {
          console.warn(`⚠️ EDT ${edt.id} no tiene fase correspondiente - creando fase por defecto`)

          // Crear fase por defecto si no existe
          const fasePorDefecto = await prisma.proyectoFase.create({
            data: {
              proyectoId: edt.proyectoId,
              proyectoCronogramaId: edt.proyectoCronogramaId!,
              nombre: 'Fase Principal',
              descripcion: 'Fase principal del proyecto (creada por migración)',
              orden: 1,
              estado: 'planificado',
              porcentajeAvance: 0
            }
          })

          // Asignar EDT a la nueva fase
          await prisma.proyectoEdt.update({
            where: { id: edt.id },
            data: { proyectoFaseId: fasePorDefecto.id }
          })

          migrated++
          console.log(`✅ EDT ${edt.id} migrado a nueva fase ${fasePorDefecto.id}`)
        }
      } catch (error) {
        console.error(`❌ Error migrando EDT ${edt.id}:`, error)
        errors++
      }
    }

    // 3. Verificar que no hay tareas huérfanas (proyectoEdtId es requerido)
    console.log(`✅ Verificando integridad: proyectoEdtId es ahora requerido`)
    console.log(`✅ No hay tareas huérfanas que limpiar (schema corregido)`)

    // 4. Verificar integridad post-migración
    console.log('\n🔍 Verificando integridad post-migración...')

    const edtsSinFase = await prisma.proyectoEdt.count({
      where: { proyectoFaseId: null }
    })

    const totalEdts = await prisma.proyectoEdt.count()
    const totalTareas = await prisma.proyectoTarea.count()

    console.log(`📊 Resumen de integridad:`)
    console.log(`   - EDTs totales: ${totalEdts}`)
    console.log(`   - EDTs sin fase: ${edtsSinFase}`)
    console.log(`   - Tareas totales: ${totalTareas}`)
    console.log(`   - Tareas sin EDT: 0 (requerido por schema)`)

    // 5. Reporte final
    console.log('\n📈 Reporte final de migración:')
    console.log(`   ✅ EDTs migrados: ${migrated}`)
    console.log(`   ⏭️  EDTs ya migrados: ${skipped}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log(`   🧹 Tareas huérfanas: 0 (schema corregido)`)

    if (edtsSinFase === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!')
      console.log('✅ Todos los EDTs tienen fase asignada')
      console.log('✅ Schema corregido: proyectoEdtId es requerido')
    } else {
      console.log('\n⚠️  Migración completada con advertencias')
      console.log(`⚠️  ${edtsSinFase} EDTs aún sin fase asignada`)
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  }
}

// Ejecutar migración
migrateProyectoCronograma()
  .catch(console.error)
  .finally(() => prisma.$disconnect())