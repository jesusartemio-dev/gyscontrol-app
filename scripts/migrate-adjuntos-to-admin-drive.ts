/**
 * Migra los adjuntos de valorización desde la raíz del Shared Drive
 * a subcarpetas organizadas dentro del Admin Drive:
 *   - categoría hes/guia_almacen → carpeta "HES"
 *   - resto (valorizacion, factura, otro) → carpeta "Valorizaciones"
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- tsx scripts/migrate-adjuntos-to-admin-drive.ts
 *
 * Flags:
 *   --dry-run   Solo muestra qué se haría, sin hacer cambios
 */

import { PrismaClient } from '@prisma/client'
import { getAdminDriveId, getOrCreateFolder, copyFile, deleteFile } from '../src/lib/services/googleDrive'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  if (DRY_RUN) console.log('🔍 DRY RUN — no se realizarán cambios\n')

  const adjuntos = await prisma.valorizacionAdjunto.findMany({
    where: { driveFileId: { not: null } },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`📎 Adjuntos encontrados con driveFileId: ${adjuntos.length}\n`)
  if (adjuntos.length === 0) return

  const adminDriveId = getAdminDriveId()
  console.log(`📂 Admin Drive ID: ${adminDriveId}`)

  if (DRY_RUN) {
    for (const adj of adjuntos) {
      const dest = ['hes', 'guia_almacen'].includes(adj.categoria ?? '') ? 'HES' : 'Valorizaciones'
      console.log(`  [${adj.categoria ?? 'otro'}] ${adj.nombreArchivo} → ${dest}/`)
    }
    return
  }

  // Crear/obtener carpetas destino
  console.log('\n📁 Preparando carpetas destino...')
  const hesFolder = await getOrCreateFolder(adminDriveId, 'HES', adminDriveId)
  const valFolder = await getOrCreateFolder(adminDriveId, 'Valorizaciones', adminDriveId)
  console.log(`  HES          → ${hesFolder}`)
  console.log(`  Valorizaciones → ${valFolder}\n`)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const adj of adjuntos) {
    const isHes = ['hes', 'guia_almacen'].includes(adj.categoria ?? '')
    const targetFolderId = isHes ? hesFolder : valFolder
    const targetFolderName = isHes ? 'HES' : 'Valorizaciones'

    try {
      // Copiar al destino
      const newFile = await copyFile(adj.driveFileId!, targetFolderId)

      // Actualizar registro en DB
      await prisma.valorizacionAdjunto.update({
        where: { id: adj.id },
        data: {
          driveFileId: newFile.id,
          urlArchivo: newFile.webViewLink,
        },
      })

      // Eliminar original (best-effort)
      try {
        await deleteFile(adj.driveFileId!)
      } catch {
        console.warn(`  ⚠️  No se pudo eliminar original ${adj.driveFileId}`)
      }

      console.log(`  ✅ ${adj.nombreArchivo} → ${targetFolderName}/`)
      migrated++
    } catch (err: any) {
      console.error(`  ❌ ${adj.nombreArchivo}: ${err?.message ?? err}`)
      errors++
    }
  }

  console.log(`\n✨ Migración completa: ${migrated} migrados, ${skipped} omitidos, ${errors} errores`)
}

main()
  .catch(err => { console.error('Error fatal:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
