// ===================================================
// 📁 Archivo: seed-seccion-seguridad.ts
// 📌 Ubicación: scripts/
// 🔧 Descripción: Inserta los permisos para que admin/gerente/seguridad vean
//                 la nueva sección "seguridad" del sidebar (gestión de EPPs).
//                 Idempotente — usa upsert.
// 🧠 Uso:
//   npx tsx scripts/seed-seccion-seguridad.ts                                          (dev)
//   npx dotenv -e .env.production -o -- npx tsx scripts/seed-seccion-seguridad.ts      (prod)
// ===================================================

import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

const SECTION_KEY = 'seguridad'
const ROLES_CON_ACCESO: Role[] = ['admin', 'gerente', 'seguridad']

async function main() {
  const dbUrl = process.env.DATABASE_URL?.slice(0, 60) ?? '(sin DATABASE_URL)'
  console.log('🔎 DB destino:', dbUrl)

  for (const role of ROLES_CON_ACCESO) {
    const result = await prisma.roleSectionAccess.upsert({
      where: { role_sectionKey: { role, sectionKey: SECTION_KEY } },
      create: { role, sectionKey: SECTION_KEY, hasAccess: true },
      update: { hasAccess: true },
    })
    console.log(`   ✔ ${role} → seguridad: hasAccess=${result.hasAccess}`)
  }

  console.log('')
  console.log('✅ Listo. Cierra y abre sesión para que los cambios se reflejen en el token.')
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
