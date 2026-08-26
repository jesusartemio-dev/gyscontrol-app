// 📁 Archivo: scripts/seed-seccion-terceros.ts
// 🔧 Descripción: Siembra el registro de role_section_access para el rol
//                 `terceros` — única sección: mi-trabajo (marcaje de asistencia).
//                 Mismo patrón que seed-seccion-seguridad.ts.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/seed-seccion-terceros.ts
import { PrismaClient } from '@prisma/client'
import type { Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await (prisma as any).roleSectionAccess.upsert({
    where: { role_sectionKey: { role: 'terceros' as Role, sectionKey: 'mi-trabajo' } },
    update: { hasAccess: true },
    create: { role: 'terceros' as Role, sectionKey: 'mi-trabajo', hasAccess: true },
  })
  console.log('✔ terceros → mi-trabajo: hasAccess =', result.hasAccess)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
