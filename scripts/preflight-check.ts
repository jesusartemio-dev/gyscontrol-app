import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  const orphans = await prisma.$queryRaw<{ orphans: number }[]>`
    SELECT COUNT(*)::int as orphans
    FROM registro_seguridad rs
    LEFT JOIN registro_horas_campo j ON j.id = rs."registroHorasCampoId"
    WHERE j.id IS NULL
  `

  const count = orphans[0]?.orphans ?? -1
  console.log(`Orphaned registro_seguridad rows: ${count}`)
  if (count === 0) {
    console.log('OK Pre-flight OK — safe to migrate')
  } else {
    console.error('FAIL Found orphaned rows — DO NOT migrate yet')
    await prisma.$disconnect()
    process.exit(1)
  }

  const evidencias = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(DISTINCT "registroHorasCampoId")::int as total FROM registro_seguridad
  `
  console.log(`Distinct jornadas in registro_seguridad (will become evidencias): ${evidencias[0]?.total}`)

  const registros = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int as total FROM registro_seguridad
  `
  console.log(`Total registro_seguridad rows (must all be preserved): ${registros[0]?.total}`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
