/**
 * Simple script to seed default duration data
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default duration templates
const defaultDurations = [
  // Construcción
  { tipoProyecto: 'construccion', nivel: 'fase', duracionDias: 30, horasPorDia: 8, bufferPorcentaje: 15 },
  { tipoProyecto: 'construccion', nivel: 'edt', duracionDias: 15, horasPorDia: 8, bufferPorcentaje: 10 },
  { tipoProyecto: 'construccion', nivel: 'actividad', duracionDias: 3, horasPorDia: 8, bufferPorcentaje: 5 },
  { tipoProyecto: 'construccion', nivel: 'tarea', duracionDias: 1, horasPorDia: 8, bufferPorcentaje: 3 },

  // Instalación
  { tipoProyecto: 'instalacion', nivel: 'fase', duracionDias: 20, horasPorDia: 8, bufferPorcentaje: 12 },
  { tipoProyecto: 'instalacion', nivel: 'edt', duracionDias: 10, horasPorDia: 8, bufferPorcentaje: 8 },
  { tipoProyecto: 'instalacion', nivel: 'actividad', duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 4 },
  { tipoProyecto: 'instalacion', nivel: 'tarea', duracionDias: 0.5, horasPorDia: 8, bufferPorcentaje: 2 },

  // Mantenimiento
  { tipoProyecto: 'mantenimiento', nivel: 'fase', duracionDias: 10, horasPorDia: 8, bufferPorcentaje: 10 },
  { tipoProyecto: 'mantenimiento', nivel: 'edt', duracionDias: 5, horasPorDia: 8, bufferPorcentaje: 7 },
  { tipoProyecto: 'mantenimiento', nivel: 'actividad', duracionDias: 1, horasPorDia: 8, bufferPorcentaje: 3 },
  { tipoProyecto: 'mantenimiento', nivel: 'tarea', duracionDias: 0.25, horasPorDia: 8, bufferPorcentaje: 1 }
]

async function seedDefaultDurations() {
  console.log('🌱 Seeding default duration templates...')

  try {
    let created = 0
    let skipped = 0

    for (const duration of defaultDurations) {
      // Check if already exists
      const existing = await prisma.plantillaDuracionCronograma.findFirst({
        where: {
          tipoProyecto: duration.tipoProyecto,
          nivel: duration.nivel,
          activo: true
        }
      })

      if (existing) {
        console.log(`⚠️  Skipping existing: ${duration.tipoProyecto} - ${duration.nivel}`)
        skipped++
        continue
      }

      // Create new duration
      await prisma.plantillaDuracionCronograma.create({
        data: {
          ...duration,
          activo: true
        }
      })

      console.log(`✅ Created: ${duration.tipoProyecto} - ${duration.nivel}`)
      created++
    }

    console.log(`\n🎉 Seed completed!`)
    console.log(`   📊 Created: ${created}`)
    console.log(`   ⚠️  Skipped: ${skipped}`)

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDefaultDurations()