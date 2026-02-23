// ===================================================
// Servicio: Acceso por Secciones (Role-Section Access)
// CRUD para gestionar qué roles ven qué secciones
// ===================================================

import { prisma } from '@/lib/prisma'
import { DEFAULT_ROLE_SECTIONS, SECTION_KEYS, type RoleKey, type SectionKey } from '@/lib/config/sections'

// Mapa de renombramientos de secciones para migrar registros viejos en BD
const SECTION_KEY_RENAMES: Record<string, SectionKey> = {
  finanzas: 'gastos',
}

// Obtener secciones accesibles para un rol
export async function getSectionAccessForRole(role: string): Promise<string[]> {
  try {
    const records = await (prisma as any).roleSectionAccess.findMany({
      where: { role, hasAccess: true },
      select: { sectionKey: true },
    })

    if (records.length > 0) {
      return records.map((r: { sectionKey: string }) => r.sectionKey)
    }

    // Fallback: usar config por defecto si no hay registros en BD
    return getSectionAccessFallback(role as RoleKey)
  } catch (error) {
    console.error('[section-access] Error getting access for role:', role, error)
    return getSectionAccessFallback(role as RoleKey)
  }
}

// Obtener accesos de todos los roles (para admin UI)
export async function getSectionAccessForAllRoles(): Promise<Record<string, string[]>> {
  try {
    const records = await (prisma as any).roleSectionAccess.findMany({
      where: { hasAccess: true },
      select: { role: true, sectionKey: true },
    })

    // Si hay registros, construir el mapa
    if (records.length > 0) {
      const accessMap: Record<string, string[]> = {}
      for (const r of records) {
        if (!accessMap[r.role]) accessMap[r.role] = []
        accessMap[r.role].push(r.sectionKey)
      }
      return accessMap
    }

    // Fallback: retornar defaults
    return { ...DEFAULT_ROLE_SECTIONS }
  } catch (error) {
    console.error('[section-access] Error getting all roles access:', error)
    return { ...DEFAULT_ROLE_SECTIONS }
  }
}

// Actualizar acceso individual
export async function updateSectionAccess(
  role: string,
  sectionKey: string,
  hasAccess: boolean,
  updatedBy: string
): Promise<void> {
  await (prisma as any).roleSectionAccess.upsert({
    where: {
      role_sectionKey: { role, sectionKey },
    },
    update: {
      hasAccess,
      updatedBy,
    },
    create: {
      role,
      sectionKey,
      hasAccess,
      updatedBy,
    },
  })
}

// Fallback: leer de la config por defecto
export function getSectionAccessFallback(role: RoleKey): string[] {
  return DEFAULT_ROLE_SECTIONS[role] || ['mi-trabajo']
}

// Migrar registros con sectionKey renombrado (ej. 'finanzas' → 'gastos')
async function migrateRenamedSections(): Promise<void> {
  for (const [oldKey, newKey] of Object.entries(SECTION_KEY_RENAMES)) {
    const oldRecords = await (prisma as any).roleSectionAccess.findMany({
      where: { sectionKey: oldKey },
    })

    for (const record of oldRecords) {
      const newExists = await (prisma as any).roleSectionAccess.findUnique({
        where: { role_sectionKey: { role: record.role, sectionKey: newKey } },
      })

      if (!newExists) {
        // Crear registro con la nueva key preservando hasAccess
        await (prisma as any).roleSectionAccess.create({
          data: {
            role: record.role,
            sectionKey: newKey,
            hasAccess: record.hasAccess,
            updatedBy: record.updatedBy,
          },
        })
      }

      // Eliminar registro viejo
      await (prisma as any).roleSectionAccess.delete({
        where: { id: record.id },
      })
    }
  }
}

// Inicializar todos los registros en BD desde los defaults
export async function seedSectionAccess(): Promise<void> {
  // Primero migrar secciones renombradas
  await migrateRenamedSections()

  const allRoles = Object.keys(DEFAULT_ROLE_SECTIONS) as RoleKey[]

  for (const role of allRoles) {
    const allowedSections = DEFAULT_ROLE_SECTIONS[role]

    for (const sectionKey of SECTION_KEYS) {
      const hasAccess = allowedSections.includes(sectionKey)
      await (prisma as any).roleSectionAccess.upsert({
        where: {
          role_sectionKey: { role, sectionKey },
        },
        update: {},  // No sobreescribir si ya existe
        create: {
          role,
          sectionKey,
          hasAccess,
        },
      })
    }
  }
}
