/**
 * Importa a la base de datos LOCAL (DATABASE_URL de `.env`, NUNCA de
 * `.env.production`) el JSON generado por `sync-catalogo-servicio-prod-export.ts`.
 * Hace upsert por `id` (los mismos ids de producción — local viene de un dump
 * de prod, así que Edt/UnidadServicio/Recurso casi seguro ya comparten esos
 * ids; solo el contenido de CatalogoServicio suele estar desactualizado).
 *
 * Dry-run por defecto (solo reporta qué se crearía/actualizaría), --apply
 * para escribir de verdad.
 *
 * Uso:
 *   npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file data/catalogo-servicio-prod-export-<timestamp>.json
 *   npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file data/catalogo-servicio-prod-export-<timestamp>.json --apply
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '../src/lib/prisma'

interface ExportPayload {
  metadata: { exportedAt: string; counts: Record<string, number> }
  data: {
    faseDefault: any[]
    edt: any[]
    unidadServicio: any[]
    recurso: any[]
    catalogoServicio: any[]
  }
}

function leerArchivo(): ExportPayload {
  const idx = process.argv.indexOf('--file')
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error('Falta --file <ruta-al-json-exportado>')
  }
  const filePath = path.resolve(process.argv[idx + 1])
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

async function upsertTabla<T extends { id: string }>(
  label: string,
  rows: T[],
  upsertUno: (row: T) => Promise<unknown>,
  apply: boolean
) {
  if (!apply) {
    console.log(`   - ${label}: ${rows.length} filas se sincronizarían (dry-run)`)
    return
  }
  let ok = 0
  for (const row of rows) {
    await upsertUno(row)
    ok++
  }
  console.log(`   - ${label}: ${ok}/${rows.length} filas sincronizadas`)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const payload = leerArchivo()

  console.log(`📦 Import de: ${payload.metadata.exportedAt}`)
  console.log(apply ? '\n🚀 Modo APLICAR — se van a escribir datos en LOCAL\n' : '\n🔎 Modo DRY-RUN — no se modifica nada\n')

  const { faseDefault, edt, unidadServicio, recurso, catalogoServicio } = payload.data

  if (!apply) {
    // Dry-run: no abrir transacción ni tocar la DB, solo reportar conteos.
    await upsertTabla('FaseDefault', faseDefault, () => Promise.resolve(), apply)
    await upsertTabla('Edt', edt, () => Promise.resolve(), apply)
    await upsertTabla('UnidadServicio', unidadServicio, () => Promise.resolve(), apply)
    await upsertTabla('Recurso', recurso, () => Promise.resolve(), apply)
    await upsertTabla('CatalogoServicio', catalogoServicio, () => Promise.resolve(), apply)
  } else {
    // Orden por dependencia de FK: faseDefault -> edt -> unidadServicio/recurso -> catalogoServicio.
    await prisma.$transaction(async tx => {
      await upsertTabla('FaseDefault', faseDefault, row =>
        tx.faseDefault.upsert({ where: { id: row.id }, create: row, update: row }), apply)

      await upsertTabla('Edt', edt, row =>
        tx.edt.upsert({ where: { id: row.id }, create: row, update: row }), apply)

      await upsertTabla('UnidadServicio', unidadServicio, row =>
        tx.unidadServicio.upsert({ where: { id: row.id }, create: row, update: row }), apply)

      await upsertTabla('Recurso', recurso, row =>
        tx.recurso.upsert({ where: { id: row.id }, create: row, update: row }), apply)

      await upsertTabla('CatalogoServicio', catalogoServicio, row =>
        tx.catalogoServicio.upsert({ where: { id: row.id }, create: row, update: row }), apply)
    })
  }

  console.log(apply ? '\n✅ Sincronización aplicada.' : '\nNada modificado (dry-run). Para aplicar de verdad, vuelve a correr con --apply')
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
