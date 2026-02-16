import pg from 'pg'
const { Client } = pg

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_uXZTGCwQy9W1@ep-cool-pine-ad9tij4p.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()
  console.log('Connected to Neon')

  // Step 1: Create enum
  try {
    await client.query(`CREATE TYPE "EstadoTimesheet" AS ENUM ('borrador', 'enviado', 'aprobado', 'rechazado')`)
    console.log('✅ Enum EstadoTimesheet created')
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('⚠️ Enum EstadoTimesheet already exists, skipping')
    } else {
      throw e
    }
  }

  // Step 2: Create table
  try {
    await client.query(`
      CREATE TABLE "timesheet_aprobacion" (
        "id" TEXT NOT NULL,
        "usuarioId" TEXT NOT NULL,
        "semana" TEXT NOT NULL,
        "estado" "EstadoTimesheet" NOT NULL DEFAULT 'borrador',
        "totalHoras" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "aprobadoPorId" TEXT,
        "motivoRechazo" TEXT,
        "fechaEnvio" TIMESTAMP(3),
        "fechaResolucion" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "timesheet_aprobacion_pkey" PRIMARY KEY ("id")
      )
    `)
    console.log('✅ Table timesheet_aprobacion created')
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('⚠️ Table already exists, skipping')
    } else {
      throw e
    }
  }

  // Step 3: Create indexes
  try {
    await client.query(`CREATE UNIQUE INDEX "timesheet_aprobacion_usuarioId_semana_key" ON "timesheet_aprobacion"("usuarioId", "semana")`)
    console.log('✅ Unique index created')
  } catch (e: any) {
    if (e.message.includes('already exists')) console.log('⚠️ Unique index exists, skipping')
    else throw e
  }

  try {
    await client.query(`CREATE INDEX "timesheet_aprobacion_estado_idx" ON "timesheet_aprobacion"("estado")`)
    console.log('✅ Estado index created')
  } catch (e: any) {
    if (e.message.includes('already exists')) console.log('⚠️ Estado index exists, skipping')
    else throw e
  }

  // Step 4: Foreign keys
  try {
    await client.query(`ALTER TABLE "timesheet_aprobacion" ADD CONSTRAINT "timesheet_aprobacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
    console.log('✅ FK usuarioId created')
  } catch (e: any) {
    if (e.message.includes('already exists')) console.log('⚠️ FK usuarioId exists, skipping')
    else throw e
  }

  try {
    await client.query(`ALTER TABLE "timesheet_aprobacion" ADD CONSTRAINT "timesheet_aprobacion_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
    console.log('✅ FK aprobadoPorId created')
  } catch (e: any) {
    if (e.message.includes('already exists')) console.log('⚠️ FK aprobadoPorId exists, skipping')
    else throw e
  }

  // Verify
  const check = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'timesheet_aprobacion' ORDER BY ordinal_position`)
  console.log('\n📋 Tabla timesheet_aprobacion:')
  for (const row of check.rows) {
    console.log(`  ${row.column_name} (${row.data_type})`)
  }

  await client.end()
  console.log('\n✅ Migration completed!')
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
