/**
 * Migra registros de RegistroHoras con fechaTrabajo a 00:00:00.000Z (medianoche UTC)
 * hacia 12:00:00.000Z (mediodía UTC) del MISMO día UTC.
 *
 * Por qué: la medianoche UTC se ve como el día anterior en clientes con TZ negativa
 * (Lima UTC-5 → 19:00 del día previo). Mover a noon UTC elimina ese shift en cualquier
 * navegador entre UTC-11 y UTC+11 sin alterar la fecha-calendario UTC.
 *
 * - Idempotente: solo toca registros con hora/min/seg = 00:00:00.
 * - Transaccional: si algo falla, rollback completo.
 * - Logea a archivo todos los old/new timestamps por si hay que revertir.
 * - NO toca registro_horas_campo (ya está 100% en noon UTC).
 *
 * Uso:
 *   # Dry-run (default, solo cuenta y muestra ejemplos)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/migrate-fechas-midnight-to-noon.ts
 *
 *   # Aplicar cambios en BD (requiere flag explícito)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/migrate-fechas-midnight-to-noon.ts --apply
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')

interface AfectadoRow {
  id: string
  fechaTrabajo: Date
  usuarioId: string
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Migración fechaTrabajo: 00:00Z → 12:00Z   [${APPLY ? 'APPLY' : 'DRY-RUN'}]`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  // 1. Confirmar a qué BD estamos apuntando
  const tzRow = await prisma.$queryRawUnsafe<{ tz: string; db: string }[]>(
    `SELECT current_setting('TIMEZONE') AS tz, current_database() AS db`
  )
  console.log(`▸ Conectado a: ${tzRow[0].db}`)
  console.log(`▸ TZ Postgres: ${tzRow[0].tz}\n`)

  // 2. Identificar registros afectables
  const afectados = await prisma.$queryRawUnsafe<AfectadoRow[]>(
    `SELECT id, "fechaTrabajo", "usuarioId"
     FROM "registro_horas"
     WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
       AND EXTRACT(MINUTE FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
       AND EXTRACT(SECOND FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
     ORDER BY "fechaTrabajo" ASC`
  )

  console.log(`▸ Registros afectables: ${afectados.length}`)

  if (afectados.length === 0) {
    console.log('  No hay nada que migrar. ✓')
    return
  }

  // 3. Mostrar muestra
  console.log('\n▸ Muestra (3 primeros, 3 últimos):')
  console.log('  id              │ before                   │ after')
  console.log('  ────────────────┼──────────────────────────┼──────────────────────────')
  const muestra = [
    ...afectados.slice(0, 3),
    ...(afectados.length > 6 ? [{ id: '...', fechaTrabajo: null as any, usuarioId: '' }] : []),
    ...afectados.slice(-3),
  ]
  for (const r of muestra) {
    if (!r.fechaTrabajo) { console.log('  ...             │ ...                      │ ...'); continue }
    const before = r.fechaTrabajo.toISOString()
    const dia = before.slice(0, 10)
    const after = `${dia}T12:00:00.000Z`
    console.log(`  ${r.id.slice(0, 14)}.. │ ${before} │ ${after}`)
  }

  // 4. Verificación de invariante: la fecha-UTC NO cambia
  const fechasInvariantes = afectados.every(r => {
    const before = r.fechaTrabajo.toISOString().slice(0, 10)
    const after = new Date(`${before}T12:00:00.000Z`).toISOString().slice(0, 10)
    return before === after
  })
  console.log(`\n▸ Invariante "fecha-UTC se preserva": ${fechasInvariantes ? '✓' : '✗ ABORTAR'}`)
  if (!fechasInvariantes) {
    throw new Error('Invariante violada — algún registro cambiaría de fecha UTC. Abortando.')
  }

  // 5. Snapshot a archivo para rollback
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const snapshotPath = join(__dirname, `migration-snapshot-${timestamp}.json`)
  const snapshot = {
    timestamp,
    mode: APPLY ? 'apply' : 'dry-run',
    afectados: afectados.map(r => ({
      id: r.id,
      usuarioId: r.usuarioId,
      before: r.fechaTrabajo.toISOString(),
      after: `${r.fechaTrabajo.toISOString().slice(0, 10)}T12:00:00.000Z`,
    })),
  }
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2))
  console.log(`\n▸ Snapshot guardado en: ${snapshotPath}`)

  // 6. Aplicar (solo si --apply)
  if (!APPLY) {
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log(`  DRY-RUN completado. ${afectados.length} registros serían modificados.`)
    console.log('  Para aplicar:  npx dotenv -e .env.production -o -- \\')
    console.log('                 npx tsx scripts/migrate-fechas-midnight-to-noon.ts --apply')
    console.log('═══════════════════════════════════════════════════════════════')
    return
  }

  console.log('\n▸ Aplicando UPDATE en transacción...')
  const result = await prisma.$transaction(async (tx) => {
    // UPDATE atómico: solo registros midnight UTC, suma 12 horas
    const upd = await tx.$executeRawUnsafe(
      `UPDATE "registro_horas"
       SET "fechaTrabajo" = "fechaTrabajo" + INTERVAL '12 hours',
           "updatedAt" = NOW()
       WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
         AND EXTRACT(MINUTE FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
         AND EXTRACT(SECOND FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0`
    )
    return upd
  })

  console.log(`✓ ${result} filas actualizadas en transacción.\n`)

  // 7. Verificación post-migración
  const [{ remaining }] = await prisma.$queryRawUnsafe<{ remaining: bigint }[]>(
    `SELECT COUNT(*)::bigint AS remaining
     FROM "registro_horas"
     WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
       AND EXTRACT(MINUTE FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
       AND EXTRACT(SECOND FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0`
  )

  console.log(`▸ Registros midnight remanentes: ${remaining}`)
  if (remaining !== 0n) {
    console.warn('⚠️  Quedan registros midnight. Investigar (¿concurrencia?).')
  } else {
    console.log('✓ Tabla limpia: 100% en noon UTC u otras horas.')
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  Migración completada.')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
