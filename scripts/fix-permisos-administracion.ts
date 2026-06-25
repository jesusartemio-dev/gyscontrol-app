/**
 * Otorga acceso a la sección 'gestion' al rol 'administracion' en la BD de producción.
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/fix-permisos-administracion.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.roleSectionAccess.upsert({
    where: { role_sectionKey: { role: 'administracion', sectionKey: 'gestion' } },
    update: { hasAccess: true, updatedBy: 'system-fix' },
    create: { role: 'administracion', sectionKey: 'gestion', hasAccess: true, updatedBy: 'system-fix' },
  })
  console.log('✅ Actualizado:', JSON.stringify(result, null, 2))
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
