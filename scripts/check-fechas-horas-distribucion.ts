/**
 * Análisis temporal de los registros con fechaTrabajo a 00:00 UTC en RegistroHoras.
 * Determina si el bug es legacy (todos antiguos) o activo (siguen creándose hoy).
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-fechas-horas-distribucion.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MesRow { mes: string; midnight: bigint; noon: bigint; otros: bigint }
interface UltimoRow { id: string; createdAt: Date; fechaTrabajo: Date; usuarioId: string; usuarioName: string | null; origen: string | null }

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Distribución temporal: midnight (00:00Z) vs noon (12:00Z)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // Distribución por mes de createdAt
  const porMes = await prisma.$queryRawUnsafe<MesRow[]>(
    `SELECT TO_CHAR("createdAt", 'YYYY-MM') AS mes,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0)::bigint AS midnight,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 12)::bigint AS noon,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') NOT IN (0, 12))::bigint AS otros
     FROM "registro_horas"
     GROUP BY mes
     ORDER BY mes ASC`
  )

  console.log('▸ Distribución por mes (createdAt):')
  console.log('  mes      │ midnight (🔴) │ noon (✅) │ otros')
  console.log('  ─────────┼──────────────┼───────────┼──────')
  for (const r of porMes) {
    console.log(`  ${r.mes}  │ ${String(r.midnight).padStart(12)} │ ${String(r.noon).padStart(9)} │ ${r.otros}`)
  }

  // Últimos 10 registros midnight para ver si son recientes
  const ultimos = await prisma.$queryRawUnsafe<UltimoRow[]>(
    `SELECT rh.id, rh."createdAt", rh."fechaTrabajo", rh."usuarioId", rh.origen, u.name AS "usuarioName"
     FROM "registro_horas" rh
     LEFT JOIN "user" u ON u.id = rh."usuarioId"
     WHERE EXTRACT(HOUR FROM rh."fechaTrabajo" AT TIME ZONE 'UTC') = 0
       AND EXTRACT(MINUTE FROM rh."fechaTrabajo" AT TIME ZONE 'UTC') = 0
     ORDER BY rh."createdAt" DESC
     LIMIT 10`
  )

  console.log('\n▸ Últimos 10 registros con midnight (00:00Z):')
  console.log('  createdAt              │ fechaTrabajo          │ origen   │ usuario')
  console.log('  ───────────────────────┼───────────────────────┼──────────┼────────────')
  for (const u of ultimos) {
    const created = u.createdAt.toISOString().slice(0, 19).replace('T', ' ')
    const ftrab = u.fechaTrabajo.toISOString().slice(0, 19).replace('T', ' ')
    console.log(`  ${created} │ ${ftrab} │ ${(u.origen || '?').padEnd(8)} │ ${u.usuarioName || u.usuarioId.slice(0, 12)}`)
  }

  // Cruce origen × hora UTC
  const porOrigen = await prisma.$queryRawUnsafe<{ origen: string; midnight: bigint; noon: bigint }[]>(
    `SELECT COALESCE(origen, '(null)') AS origen,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 0)::bigint AS midnight,
            COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "fechaTrabajo" AT TIME ZONE 'UTC') = 12)::bigint AS noon
     FROM "registro_horas"
     GROUP BY origen
     ORDER BY origen`
  )

  console.log('\n▸ Cruce por origen × hora UTC:')
  console.log('  origen   │ midnight (🔴) │ noon (✅)')
  console.log('  ─────────┼──────────────┼───────────')
  for (const r of porOrigen) {
    console.log(`  ${r.origen.padEnd(8)} │ ${String(r.midnight).padStart(12)} │ ${String(r.noon).padStart(9)}`)
  }

  // Por endpoint heurístico: si tiene proyectoTareaId pero categoria='general' es probable wizard
  // No es 100% certero pero ayuda a identificar patrones
  console.log()
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
