import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  const nullEvidencia = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int as total FROM registro_seguridad WHERE "evidenciaSeguridadId" IS NULL
  `
  const n = nullEvidencia[0]?.total ?? -1
  console.log(`registro_seguridad con evidenciaSeguridadId NULL: ${n}`)
  if (n !== 0) {
    console.error('FAIL — hay registros sin evidencia asignada')
    await prisma.$disconnect()
    process.exit(1)
  }

  const totalRegistros = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int as total FROM registro_seguridad
  `
  console.log(`Total registro_seguridad: ${totalRegistros[0]?.total} (deben ser 3)`)

  const totalEvidencias = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int as total FROM evidencia_seguridad
  `
  console.log(`Total evidencia_seguridad: ${totalEvidencias[0]?.total} (debe ser 1)`)

  console.log('OK Post-migration check passed')
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
