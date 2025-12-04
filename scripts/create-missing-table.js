/**
 * Script to execute the missing table creation
 */
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable not set')
  process.exit(1)
}

// Create table using direct SQL
const sql = `
-- Drop existing table if it exists
DROP TABLE IF EXISTS "plantilla_duracion_cronograma";

-- Create table with correct structure
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
);

-- Create indexes
CREATE UNIQUE INDEX "plantilla_duracion_cronograma_tipoProyecto_nivel_key" ON "plantilla_duracion_cronograma"("tipoProyecto", "nivel");
CREATE INDEX "plantilla_duracion_cronograma_tipoProyecto_activo_idx" ON "plantilla_duracion_cronograma"("tipoProyecto", "activo");
CREATE INDEX "plantilla_duracion_cronograma_nivel_activo_idx" ON "plantilla_duracion_cronograma"("nivel", "activo");

-- Insert default data
INSERT INTO plantilla_duracion_cronograma (id, tipoProyecto, nivel, duracionDias, horasPorDia, bufferPorcentaje, activo, createdAt, updatedAt) VALUES
-- Construcción
(gen_random_uuid(), 'construccion', 'fase', 30, 8, 15, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'edt', 15, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'actividad', 3, 8, 5, true, NOW(), NOW()),
(gen_random_uuid(), 'construccion', 'tarea', 1, 8, 3, true, NOW(), NOW()),

-- Instalación
(gen_random_uuid(), 'instalacion', 'fase', 20, 8, 12, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'edt', 10, 8, 8, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'actividad', 2, 8, 4, true, NOW(), NOW()),
(gen_random_uuid(), 'instalacion', 'tarea', 0.5, 8, 2, true, NOW(), NOW()),

-- Mantenimiento
(gen_random_uuid(), 'mantenimiento', 'fase', 10, 8, 10, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'edt', 5, 8, 7, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'actividad', 1, 8, 3, true, NOW(), NOW()),
(gen_random_uuid(), 'mantenimiento', 'tarea', 0.25, 8, 1, true, NOW(), NOW());

-- Add conflict handling if needed
-- ON CONFLICT (tipoProyecto, nivel) DO NOTHING;
`

async function createTable() {
  const pool = new Pool({ connectionString })
  
  try {
    console.log('🗃️  Creating missing tabla_duracion_cronograma table...')
    
    await pool.query(sql)
    
    console.log('✅ Table created successfully!')
    
    // Verify the table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'plantilla_duracion_cronograma'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Table confirmation: plantilla_duracion_cronograma exists')
    } else {
      console.log('⚠️  Warning: Table may not have been created')
    }
    
  } catch (error) {
    console.error('❌ Error creating table:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createTable()