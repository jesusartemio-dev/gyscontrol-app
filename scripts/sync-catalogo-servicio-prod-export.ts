/**
 * Exporta (SOLO LECTURA) el catálogo de servicios y sus tablas relacionadas
 * (Edt, FaseDefault, UnidadServicio, Recurso) desde la base de datos apuntada
 * por DATABASE_URL — pensado para correr contra PRODUCCIÓN — a un archivo
 * JSON en disco. Este script NO escribe nada en la base de datos: solo
 * contiene `findMany`, nunca `.create`/`.update`/`.upsert`/`.delete`.
 *
 * El import a local se hace en un segundo paso, con un script separado
 * (`sync-catalogo-servicio-local-import.ts`) que nunca toca credenciales de
 * producción — las dos direcciones (leer prod / escribir local) se mantienen
 * en procesos distintos a propósito.
 *
 * Uso (contra producción):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/sync-catalogo-servicio-prod-export.ts
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log(`🔎 Exportando catálogo de servicios desde: ${process.env.DATABASE_URL?.slice(0, 40)}...\n`)

  // catalogoServicio usa `select` explícito con SOLO las columnas que ya
  // existían antes de la migración `20260709100000_catalogo_servicio_estructura_ia`
  // — producción todavía no tiene esa migración aplicada cuando este script
  // corre por primera vez, así que un `findMany()` sin select fallaría al
  // pedir columnas (actividadTag/filtroAlcance/...) que no existen ahí. Los
  // campos estructurados nuevos se poblan LOCAL con el script de backfill
  // (Bloque A.3), no se traen de prod.
  const [faseDefault, edt, unidadServicio, recurso, catalogoServicio] = await Promise.all([
    prisma.faseDefault.findMany(),
    prisma.edt.findMany(),
    prisma.unidadServicio.findMany(),
    prisma.recurso.findMany(),
    prisma.catalogoServicio.findMany({
      select: {
        id: true,
        categoriaId: true,
        unidadServicioId: true,
        recursoId: true,
        nombre: true,
        descripcion: true,
        horaBase: true,
        horaRepetido: true,
        createdAt: true,
        updatedAt: true,
        orden: true,
        cantidad: true,
        nivelDificultad: true,
      },
    }),
  ])

  const outputDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputFile = path.join(outputDir, `catalogo-servicio-prod-export-${timestamp}.json`)

  const payload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      counts: {
        faseDefault: faseDefault.length,
        edt: edt.length,
        unidadServicio: unidadServicio.length,
        recurso: recurso.length,
        catalogoServicio: catalogoServicio.length,
      },
    },
    data: { faseDefault, edt, unidadServicio, recurso, catalogoServicio },
  }

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2))

  console.log('📊 Filas exportadas:')
  console.log(`   - FaseDefault: ${faseDefault.length}`)
  console.log(`   - Edt: ${edt.length}`)
  console.log(`   - UnidadServicio: ${unidadServicio.length}`)
  console.log(`   - Recurso: ${recurso.length}`)
  console.log(`   - CatalogoServicio: ${catalogoServicio.length}`)
  console.log(`\n✅ Exportado a: ${outputFile}`)
  console.log('   Siguiente paso: npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file ' + outputFile)
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
