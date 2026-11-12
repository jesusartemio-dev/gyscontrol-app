/**
 * Sube a Drive las fotos de EPP extraídas de la plantilla y las enlaza al
 * catálogo de la matriz.
 *
 * Van a la biblioteca global de imágenes que ya existe —carpeta
 * "Biblioteca PT — Imágenes de referencia" en el Shared Drive— con categoría
 * EPP, para no inventar un almacenamiento aparte. Cada foto queda como una
 * CatalogoImagen y el EPP la referencia.
 *
 * Antes de correr esto hay que tener las imágenes extraídas:
 *   npx tsx scripts/extraer-imagenes-mpp.ts --extraer
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/subir-imagenes-mpp-drive.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/subir-imagenes-mpp-drive.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { uploadFile } from '../src/lib/services/googleDrive'
import { getOrCreateCatalogoImagenesFolder } from '../src/lib/catalogoImagenes/getOrCreateCatalogoImagenesFolder'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const CARPETA_LOCAL = 'data/mpp-imagenes'

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

/** Palabras del nombre, para poder buscarla después en la biblioteca. */
function keywords(nombre: string): string[] {
  return [...new Set(
    nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .split(/[^a-z0-9]+/).filter(p => p.length > 2),
  )].slice(0, 12)
}

async function main() {
  const archivos = readdirSync(CARPETA_LOCAL)
    .filter(f => MIME[path.extname(f).toLowerCase()])
    .sort()
  if (archivos.length === 0) {
    throw new Error(`No hay imágenes en ${CARPETA_LOCAL}. Corré extraer-imagenes-mpp.ts --extraer primero.`)
  }

  const catalogo = await prisma.mppEppCatalogo.findMany({ orderBy: { orden: 'asc' } })
  console.log(`${DRY ? '[DRY] ' : ''}${archivos.length} imágenes · ${catalogo.length} EPP en el catálogo`)

  const yaTienen = catalogo.filter(e => e.catalogoImagenId).length
  if (yaTienen > 0) console.log(`${yaTienen} EPP ya tienen imagen enlazada (se saltan)`)

  if (DRY) {
    for (const f of archivos.slice(0, 6)) {
      const orden = Number(f.slice(0, 2))
      const epp = catalogo.find(e => e.orden === orden)
      console.log(`  ${f}  →  ${epp ? epp.nombre : '⚠ sin EPP con ese orden'}`)
    }
    console.log(`  …y ${archivos.length - 6} más`)
    console.log('\nNada subido.')
    return
  }

  const folderId = await getOrCreateCatalogoImagenesFolder()
  console.log(`Carpeta de Drive: ${folderId}\n`)

  let subidas = 0
  let saltadas = 0
  for (const archivo of archivos) {
    const orden = Number(archivo.slice(0, 2))
    const epp = catalogo.find(e => e.orden === orden)
    if (!epp) { console.log(`  ⚠ ${archivo}: no hay EPP con orden ${orden}`); continue }
    if (epp.catalogoImagenId) { saltadas++; continue }

    const ext = path.extname(archivo).toLowerCase()
    const buffer = readFileSync(path.join(CARPETA_LOCAL, archivo))
    const nombreDrive = `EPP ${String(orden).padStart(2, '0')} — ${epp.nombre}${ext}`

    const subido = await uploadFile({
      folderId,
      fileName: nombreDrive,
      mimeType: MIME[ext],
      buffer,
    })
    if (!subido.id) { console.log(`  ⚠ ${archivo}: Drive no devolvió id`); continue }

    const imagen = await prisma.catalogoImagen.create({
      data: {
        nombre: epp.nombre,
        categoria: 'EPP',
        driveFileId: subido.id,
        thumbnailUrl: subido.thumbnailLink ?? null,
        keywords: keywords(epp.nombre),
      },
    })
    await prisma.mppEppCatalogo.update({
      where: { id: epp.id },
      data: { catalogoImagenId: imagen.id },
    })

    subidas++
    console.log(`  ${String(orden).padStart(2)} ${epp.nombre.slice(0, 48).padEnd(48)} ${subido.id}`)
  }

  console.log(`\nSubidas: ${subidas} · ya tenían: ${saltadas}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
