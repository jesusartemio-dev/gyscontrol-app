// Script para inicializar los registros de acceso por secciones
// Ejecutar una vez: npx tsx prisma/seed-section-access.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SECTION_KEYS = [
  'comercial', 'crm', 'proyectos', 'mi-trabajo', 'supervision',
  'logistica', 'aprovisionamiento', 'gestion', 'configuracion',
] as const

const DEFAULT_ROLE_SECTIONS: Record<string, readonly string[]> = {
  admin: ['comercial', 'crm', 'proyectos', 'mi-trabajo', 'supervision', 'logistica', 'aprovisionamiento', 'gestion', 'configuracion'],
  gerente: ['comercial', 'crm', 'proyectos', 'mi-trabajo', 'supervision', 'logistica', 'aprovisionamiento', 'gestion', 'configuracion'],
  gestor: ['proyectos', 'mi-trabajo', 'supervision', 'aprovisionamiento', 'gestion'],
  coordinador: ['proyectos', 'mi-trabajo', 'supervision'],
  proyectos: ['proyectos', 'mi-trabajo', 'supervision'],
  seguridad: ['mi-trabajo'],
  comercial: ['comercial', 'crm', 'mi-trabajo'],
  presupuestos: ['comercial', 'mi-trabajo'],
  logistico: ['logistica', 'mi-trabajo'],
  colaborador: ['mi-trabajo'],
}

async function main() {
  console.log('Seeding section access...')

  let created = 0
  let skipped = 0

  for (const [role, allowedSections] of Object.entries(DEFAULT_ROLE_SECTIONS)) {
    for (const sectionKey of SECTION_KEYS) {
      const hasAccess = allowedSections.includes(sectionKey)

      const existing = await (prisma as any).roleSectionAccess.findUnique({
        where: { role_sectionKey: { role, sectionKey } },
      })

      if (existing) {
        skipped++
        continue
      }

      await (prisma as any).roleSectionAccess.create({
        data: { role, sectionKey, hasAccess },
      })
      created++
    }
  }

  console.log(`Done! Created: ${created}, Skipped (already exist): ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
