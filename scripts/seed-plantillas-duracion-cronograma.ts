/**
 * Script para poblar datos por defecto de plantillas de duración de cronograma
 *
 * Ejecutar con: npx ts-node scripts/seed-plantillas-duracion-cronograma.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos por defecto para plantillas de duración
const plantillasPorDefecto = [
  // Construcción
  { tipoProyecto: 'construccion', nivel: 'fase', duracionDias: 30, horasPorDia: 8, bufferPorcentaje: 15 },
  { tipoProyecto: 'construccion', nivel: 'edt', duracionDias: 15, horasPorDia: 8, bufferPorcentaje: 10 },
  { tipoProyecto: 'construccion', nivel: 'zona', duracionDias: 7, horasPorDia: 8, bufferPorcentaje: 8 },
  { tipoProyecto: 'construccion', nivel: 'actividad', duracionDias: 3, horasPorDia: 8, bufferPorcentaje: 5 },
  { tipoProyecto: 'construccion', nivel: 'tarea', duracionDias: 1, horasPorDia: 8, bufferPorcentaje: 3 },

  // Instalación
  { tipoProyecto: 'instalacion', nivel: 'fase', duracionDias: 20, horasPorDia: 8, bufferPorcentaje: 12 },
  { tipoProyecto: 'instalacion', nivel: 'edt', duracionDias: 10, horasPorDia: 8, bufferPorcentaje: 8 },
  { tipoProyecto: 'instalacion', nivel: 'zona', duracionDias: 5, horasPorDia: 8, bufferPorcentaje: 6 },
  { tipoProyecto: 'instalacion', nivel: 'actividad', duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 4 },
  { tipoProyecto: 'instalacion', nivel: 'tarea', duracionDias: 0.5, horasPorDia: 8, bufferPorcentaje: 2 },

  // Mantenimiento
  { tipoProyecto: 'mantenimiento', nivel: 'fase', duracionDias: 10, horasPorDia: 8, bufferPorcentaje: 10 },
  { tipoProyecto: 'mantenimiento', nivel: 'edt', duracionDias: 5, horasPorDia: 8, bufferPorcentaje: 7 },
  { tipoProyecto: 'mantenimiento', nivel: 'zona', duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 5 },
  { tipoProyecto: 'mantenimiento', nivel: 'actividad', duracionDias: 1, horasPorDia: 8, bufferPorcentaje: 3 },
  { tipoProyecto: 'mantenimiento', nivel: 'tarea', duracionDias: 0.25, horasPorDia: 8, bufferPorcentaje: 1 }
]

async function seedPlantillasDuracion() {
  console.log('🌱 Iniciando seed de plantillas de duración de cronograma...')

  try {
    let creadas = 0
    let existentes = 0

    for (const plantilla of plantillasPorDefecto) {
      // Verificar si ya existe
      const existente = await (prisma as any).plantillaDuracionCronograma.findFirst({
        where: {
          tipoProyecto: plantilla.tipoProyecto,
          nivel: plantilla.nivel,
          activo: true
        }
      })

      if (existente) {
        console.log(`⚠️  Ya existe plantilla para ${plantilla.tipoProyecto} - ${plantilla.nivel}`)
        existentes++
        continue
      }

      // Crear nueva plantilla
      await (prisma as any).plantillaDuracionCronograma.create({
        data: {
          tipoProyecto: plantilla.tipoProyecto,
          nivel: plantilla.nivel,
          duracionDias: plantilla.duracionDias,
          horasPorDia: plantilla.horasPorDia,
          bufferPorcentaje: plantilla.bufferPorcentaje,
          activo: true
        }
      })

      console.log(`✅ Creada plantilla para ${plantilla.tipoProyecto} - ${plantilla.nivel}`)
      creadas++
    }

    console.log(`\n🎉 Seed completado:`)
    console.log(`   📊 Plantillas creadas: ${creadas}`)
    console.log(`   ⚠️  Plantillas ya existentes: ${existentes}`)
    console.log(`   📈 Total procesadas: ${creadas + existentes}`)

  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el seed
if (require.main === module) {
  seedPlantillasDuracion()
}

export { seedPlantillasDuracion }