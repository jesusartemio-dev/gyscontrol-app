// Script to clear all fases for testing
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearFases() {
  try {
    console.log('🗑️ Clearing all fases from database...')

    // First check what's in the database
    const allFases = await prisma.faseDefault.findMany()
    console.log(`📊 Found ${allFases.length} total fases in database`)

    const activeFases = allFases.filter(f => f.activo)
    const inactiveFases = allFases.filter(f => !f.activo)

    console.log(`✅ Active fases: ${activeFases.length}`)
    console.log(`❌ Inactive fases: ${inactiveFases.length}`)

    if (inactiveFases.length > 0) {
      console.log('Inactive fases:', inactiveFases.map(f => `${f.nombre} (${f.activo})`))
    }

    // Delete all fases (hard delete for testing)
    const result = await prisma.faseDefault.deleteMany({})

    console.log(`✅ Deleted ${result.count} fases from database`)
  } catch (error) {
    console.error('❌ Error clearing fases:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearFases()