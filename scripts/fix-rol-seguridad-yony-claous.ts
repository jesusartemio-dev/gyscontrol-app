/**
 * 📁 scripts/fix-rol-seguridad-yony-claous.ts
 *
 * Revierte a YONY APAZA y CLAOUS MARRUJO al rol `seguridad` (estaban en
 * `gestor` como workaround) y habilita la sección `documentos` (Drive) para
 * ese rol, que era una de las cosas que el workaround les daba.
 *
 * Va acompañado de cambios de código que amplían el rol `seguridad`:
 *  - GET /api/proyectos/[id]  → lectura del detalle de proyecto
 *  - GET /api/seguridad/reportes-semanales → ve los del equipo, no solo los suyos
 *  - Sidebar/sections → secciones proyectos + documentos
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-rol-seguridad-yony-claous.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-rol-seguridad-yony-claous.ts --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const EMAILS_A_REVERTIR = ['yony.a@gyscontrol.com', 'claous.m@gyscontrol.com']
const SECCIONES_A_HABILITAR: Array<{ role: string; sectionKey: string }> = [
  { role: 'seguridad', sectionKey: 'documentos' },
]

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (solo lectura)'}`)
  console.log('DB:', process.env.DATABASE_URL?.slice(0, 40), '\n')

  // 1) Secciones
  console.log('=== 1. role_section_access ===')
  for (const { role, sectionKey } of SECCIONES_A_HABILITAR) {
    const actual = await (prisma as any).roleSectionAccess.findUnique({
      where: { role_sectionKey: { role, sectionKey } },
      select: { hasAccess: true },
    })
    console.log(`  ${role} → ${sectionKey}: ${actual ? `hasAccess=${actual.hasAccess}` : 'sin registro'} => true`)
    if (APPLY) {
      await (prisma as any).roleSectionAccess.upsert({
        where: { role_sectionKey: { role, sectionKey } },
        update: { hasAccess: true },
        create: { role, sectionKey, hasAccess: true },
      })
    }
  }

  // 2) Roles de usuario
  console.log('\n=== 2. Rol de usuario ===')
  for (const email of EMAILS_A_REVERTIR) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } })
    if (!u) {
      console.log(`  ⚠ ${email}: NO ENCONTRADO`)
      continue
    }
    console.log(`  ${u.name} (${email}): ${u.role} => seguridad`)
    if (APPLY && u.role !== 'seguridad') {
      await prisma.user.update({ where: { id: u.id }, data: { role: 'seguridad' as any } })
    }
  }

  // 3) Verificación posterior
  if (APPLY) {
    console.log('\n=== 3. Verificación ===')
    const recs = await (prisma as any).roleSectionAccess.findMany({
      where: { role: 'seguridad', hasAccess: true },
      select: { sectionKey: true },
      orderBy: { sectionKey: 'asc' },
    })
    console.log('  Secciones de `seguridad`:', recs.map((r: any) => r.sectionKey).join(', '))
    const users = await prisma.user.findMany({
      where: { email: { in: EMAILS_A_REVERTIR } },
      select: { name: true, role: true },
    })
    for (const u of users) console.log(`  ${u.name}: ${u.role}`)
    console.log('\n  ⚠ Ambos deben CERRAR SESIÓN y volver a entrar: sectionAccess y role')
    console.log('    viven en el JWT y no se refrescan solos.')
  } else {
    console.log('\n(dry-run: no se escribió nada. Repetir con --apply)')
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
