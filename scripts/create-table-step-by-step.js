/**
 * Simplified script to create and populate the table
 */
import { PrismaClient } from '@prisma/client'

// Use the same initialization as the app
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? (() => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set')
    process.exit(1)
  }

  const { Pool } = require('pg')
  const { PrismaPg } = require('@prisma/adapter-pg')
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
})()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function createAndSeedTable() {
  try {
    console.log('🗃️  Step 1: Dropping existing table...')
    await prisma.$executeRaw`DROP TABLE IF EXISTS "plantilla_duracion_cronograma" CASCADE`
    console.log('✅ Table dropped')

    console.log('🗃️  Step 2: Creating table...')
    await prisma.$executeRaw`
      CREATE TABLE "plantilla_duracion_cronograma" (
        "id" TEXT NOT NULL,
        "tipoProyecto" TEXT NOT NULL,
        "nivel" TEXT NOT NULL,
        "duracionDias" DOUBLE PRECISION NOT NULL,
        "horasPorDia" DOUBLE PRECISION NOT NULL,
        "bufferPorcentaje" DOUBLE PRECISION NOT NULL,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "plantilla_duracion_cronograma_pkey" PRIMARY KEY ("id")
      )
    `
    console.log('✅ Table created')

    console.log('🗃️  Step 3: Creating indexes...')
    await prisma.$executeRaw`CREATE UNIQUE INDEX "idx_duracion_unique" ON "plantilla_duracion_cronograma"("tipoProyecto", "nivel")`
    console.log('✅ Indexes created')

    console.log('🗃️  Step 4: Inserting data...')
    await prisma.$executeRaw`
      INSERT INTO "plantilla_duracion_cronograma" 
      ("id", "tipoProyecto", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt") 
      VALUES 
      (gen_random_uuid(), 'construccion', 'fase', 30, 8, 15, true, NOW(), NOW()),
      (gen_random_uuid(), 'construccion', 'edt', 15, 8, 10, true, NOW(), NOW()),
      (gen_random_uuid(), 'construccion', 'actividad', 3, 8, 5, true, NOW(), NOW()),
      (gen_random_uuid(), 'construccion', 'tarea', 1, 8, 3, true, NOW(), NOW()),
      (gen_random_uuid(), 'instalacion', 'fase', 20, 8, 12, true, NOW(), NOW()),
      (gen_random_uuid(), 'instalacion', 'edt', 10, 8, 8, true, NOW(), NOW()),
      (gen_random_uuid(), 'instalacion', 'actividad', 2, 8, 4, true, NOW(), NOW()),
      (gen_random_uuid(), 'instalacion', 'tarea', 0.5, 8, 2, true, NOW(), NOW()),
      (gen_random_uuid(), 'mantenimiento', 'fase', 10, 8, 10, true, NOW(), NOW()),
      (gen_random_uuid(), 'mantenimiento', 'edt', 5, 8, 7, true, NOW(), NOW()),
      (gen_random_uuid(), 'mantenimiento', 'actividad', 1, 8, 3, true, NOW(), NOW()),
      (gen_random_uuid(), 'mantenimiento', 'tarea', 0.25, 8, 1, true, NOW(), NOW())
    `
    console.log('✅ Data inserted')

    console.log('🗃️  Step 5: Verifying table...')
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"`
    console.log(`✅ Table has ${result[0].count} records`)

    console.log('\n🎉 Setup completed successfully!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAndSeedTable()