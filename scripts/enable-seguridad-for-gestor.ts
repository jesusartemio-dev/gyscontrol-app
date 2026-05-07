import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  const existing = await (prisma as any).roleSectionAccess.findUnique({
    where: { role_sectionKey: { role: 'gestor', sectionKey: 'seguridad' } },
  })

  console.log('Estado actual:', existing ?? 'No existe registro')

  const result = await (prisma as any).roleSectionAccess.upsert({
    where: { role_sectionKey: { role: 'gestor', sectionKey: 'seguridad' } },
    update: { hasAccess: true },
    create: {
      role: 'gestor',
      sectionKey: 'seguridad',
      hasAccess: true,
    },
  })

  console.log('OK Estado nuevo:', result)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
