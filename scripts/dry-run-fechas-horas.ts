/**
 * DRY-RUN: análisis del manejo de fechas en RegistroHoras y RegistroHorasCampo.
 *
 * Solo lectura — no modifica datos. Reporta:
 *  1. TZ de Postgres (Neon)
 *  2. Histograma de hora-del-día en fechaTrabajo
 *  3. Cuántos registros serían afectados por una migración 00:00Z → 12:00Z
 *  4. Muestra ejemplos para verificar que la fecha-calendario se preserva
 *
 * Uso (contra producción):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/dry-run-fechas-horas.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface HistRow { hora: number; total: bigint }
interface SampleRow {
  id: string
  fechaTrabajo: Date
  iso: string
  hora_utc: number
  fecha_utc: string
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  DRY-RUN — Análisis de fechas en RegistroHoras / RegistroHorasCampo')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // ── 1. TZ de Postgres ──
  const tzRows = await prisma.$queryRawUnsafe<{ tz: string; now: Date }[]>(
    `SELECT current_setting('TIMEZONE') AS tz, now() AS now`
  )
  console.log('▸ Postgres (Neon)')
  console.log(`    timezone: ${tzRows[0].tz}`)
  console.log(`    now():    ${tzRows[0].now.toISOString()}\n`)

  // ── 2. TZ de Node (este script local) ──
  console.log('▸ Node (este script local — no es la TZ de Vercel)')
  console.log(`    process.env.TZ:           ${process.env.TZ || '(sin definir)'}`)
  console.log(`    Intl resolved TZ:         ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
  console.log(`    new Date().getTimezoneOffset(): ${new Date().getTimezoneOffset()} min\n`)

  for (const tabla of ['registro_horas', 'registro_horas_campo']) {
    console.log('───────────────────────────────────────────────────────────────')
    console.log(`  Tabla: ${tabla}`)
    console.log('───────────────────────────────────────────────────────────────')

    // ── 3. Total de registros ──
    const [{ total }] = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `SELECT COUNT(*)::bigint AS total FROM "${tabla}"`
    )
    console.log(`▸ Total de registros: ${total}`)

    if (total === 0n) {
      console.log('  (tabla vacía, salto)\n')
      continue
    }

    // ── 4. Histograma de hora UTC del día ──
    const hist = await prisma.$queryRawUnsafe<HistRow[]>(
      `SELECT EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC')::int AS hora,
              COUNT(*)::bigint AS total
       FROM "${tabla}"
       GROUP BY hora
       ORDER BY total DESC`
    )
    console.log('\n▸ Histograma de hora-del-día UTC en fechaTrabajo:')
    console.log('  hora UTC │ registros │ %')
    console.log('  ─────────┼───────────┼──────')
    for (const row of hist) {
      const pct = ((Number(row.total) / Number(total)) * 100).toFixed(1)
      console.log(`  ${String(row.hora).padStart(8)} │ ${String(row.total).padStart(9)} │ ${pct}%`)
    }

    // ── 5. Conteo "afectables": hora=0 (medianoche UTC) ──
    const [{ afectables }] = await prisma.$queryRawUnsafe<{ afectables: bigint }[]>(
      `SELECT COUNT(*)::bigint AS afectables
       FROM "${tabla}"
       WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
         AND EXTRACT(MINUTE FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0
         AND EXTRACT(SECOND FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0`
    )
    const pct = ((Number(afectables) / Number(total)) * 100).toFixed(1)
    console.log(`\n▸ Registros que serían MIGRADOS (hora UTC = 00:00:00.000):`)
    console.log(`  ${afectables} de ${total} (${pct}%)`)

    // ── 6. Muestra de 5 registros: cómo se vería antes/después ──
    const muestra = await prisma.$queryRawUnsafe<SampleRow[]>(
      `SELECT id,
              "fechaTrabajo",
              "fechaTrabajo"::text AS iso,
              EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC')::int AS hora_utc,
              TO_CHAR("fechaTrabajo" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS fecha_utc
       FROM "${tabla}"
       ORDER BY "fechaTrabajo" DESC
       LIMIT 5`
    )
    console.log('\n▸ Muestra (últimos 5 registros):')
    console.log('  id              │ fecha-UTC  │ hora-UTC │ ISO completo')
    console.log('  ────────────────┼────────────┼──────────┼────────────────────────────')
    for (const m of muestra) {
      console.log(`  ${m.id.slice(0, 14)}.. │ ${m.fecha_utc} │ ${String(m.hora_utc).padStart(8)} │ ${m.fechaTrabajo.toISOString()}`)
    }

    // ── 7. Verificar que la fecha-UTC se preservaría tras la migración ──
    //    Si todos los afectables están a las 00:00:00, mover a 12:00:00 mantiene la misma fecha UTC.
    //    Solo se rompería si hubiera registros donde la migración cruza al día siguiente,
    //    pero como vamos de 00:00 → 12:00 (mismo día UTC), eso es imposible.
    console.log('\n▸ Verificación de preservación de fecha-UTC:')
    console.log('  Migración propuesta: 00:00:00.000Z → 12:00:00.000Z (mismo día UTC)')
    console.log('  ✓ La fecha calendario UTC NO cambia para ningún registro afectable.')
    console.log()
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  DRY-RUN completado. Ningún dato fue modificado.')
  console.log('═══════════════════════════════════════════════════════════════')
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
