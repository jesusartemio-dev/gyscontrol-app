import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Actualizando tipo de plantillas existentes...')

  // Verificar si hay plantillas existentes
  const totalPlantillas = await prisma.plantilla.count()

  if (totalPlantillas === 0) {
    console.log('ℹ️ No hay plantillas existentes para actualizar')
    return
  }

  // Para plantillas existentes, intentar actualizar usando SQL directo
  // ya que Prisma no permite filtrar por null en enums
  try {
    await prisma.$executeRaw`
      UPDATE "Plantilla" SET "tipo" = 'completa' WHERE "tipo" IS NULL
    `

    const plantillasCompletas = await prisma.plantilla.count({
      where: { tipo: 'completa' }
    })

    console.log(`✅ Plantillas actualizadas a tipo 'completa': ${plantillasCompletas}`)
  } catch (error) {
    console.log('ℹ️ No se pudieron actualizar plantillas existentes (posiblemente ya tienen tipo asignado)')
  }

  // Verificar estadísticas finales
  const stats = await prisma.plantilla.groupBy({
    by: ['tipo'],
    _count: {
      tipo: true
    }
  })

  console.log('📊 Estadísticas de plantillas por tipo:')
  stats.forEach(stat => {
    console.log(`  ${stat.tipo}: ${stat._count.tipo}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })