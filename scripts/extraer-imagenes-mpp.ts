/**
 * Saca las imágenes de EPP incrustadas en la plantilla del MPP, las sube a
 * Drive y las guarda en el catálogo.
 *
 * Hoy las 63 fotos viven dentro de plantilla-mpp.xlsx, ancladas a filas fijas
 * de la hoja "MATRIZ EPPs". El render escribe el texto y las imágenes se
 * quedan donde la plantilla las puso: la foto de la fila 12 es la del EPP que
 * caiga en la fila 12. Por eso el catálogo no se puede tocar — agregar,
 * desactivar o reordenar un EPP descoloca todas las fotos siguientes.
 *
 * Al pasarlas a Drive y referenciarlas desde el catálogo, la imagen pasa a
 * pertenecer al equipo y no a una posición.
 *
 *   npx tsx scripts/extraer-imagenes-mpp.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/extraer-imagenes-mpp.ts
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { unzipSync } from 'fflate'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const SOLO_EXTRAER = process.argv.includes('--extraer')

const PLANTILLA = 'src/lib/services/mpp/templates/plantilla-mpp.xlsx'
/** Fila 1-based donde empieza la tabla de EPP; el `orden` 1 va ahí. */
const PRIMERA_FILA_DATOS = 9
const SALIDA = 'data/mpp-imagenes'

interface Imagen {
  /** Fila 1-based de la hoja a la que está anclada. */
  fila: number
  /** Columna 1-based. */
  columna: number
  archivo: string
  buffer: Buffer
  ext: string
}

type Zip = Record<string, Uint8Array>

/** Lee los anclajes del drawing y resuelve cada uno a su archivo de imagen. */
function leerImagenes(zip: Zip): Imagen[] {
  const texto = (nombre: string) => (zip[nombre] ? Buffer.from(zip[nombre]).toString('utf8') : '')

  // Qué drawing usa la hoja 1 (la de la matriz).
  const relsHoja = texto('xl/worksheets/_rels/sheet1.xml.rels')
  const drawing = /Target="([^"]*drawing\d+\.xml)"/.exec(relsHoja)?.[1]
  if (!drawing) throw new Error('La hoja 1 no tiene drawing')
  const rutaDrawing = drawing.replace(/^\/?(xl\/)?/, 'xl/')

  const relsDrawing = texto(rutaDrawing.replace('xl/drawings/', 'xl/drawings/_rels/') + '.rels')
  const porId = new Map<string, string>()
  for (const m of relsDrawing.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1]
    const target = /Target="([^"]+)"/.exec(m[0])?.[1]
    if (id && target) porId.set(id, target.replace(/^\/?(xl\/)?/, 'xl/'))
  }

  const xml = texto(rutaDrawing)
  const imagenes: Imagen[] = []
  for (const m of xml.matchAll(/<(twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const cuerpo = m[2]
    const desde = /<from>\s*<col>(\d+)<\/col>[\s\S]*?<row>(\d+)<\/row>/.exec(cuerpo)
    const rId = /r:embed="([^"]+)"/.exec(cuerpo)?.[1]
    if (!desde || !rId) continue
    const ruta = porId.get(rId)
    if (!ruta) continue
    const datos = zip[ruta]
    if (!datos) continue
    imagenes.push({
      // openpyxl y el XML cuentan desde 0; la hoja desde 1.
      fila: Number(desde[2]) + 1,
      columna: Number(desde[1]) + 1,
      archivo: path.basename(ruta),
      buffer: Buffer.from(datos),
      ext: path.extname(ruta).replace('.', '') || 'png',
    })
  }
  return imagenes
}

async function main() {
  const zip = unzipSync(new Uint8Array(readFileSync(PLANTILLA)))
  const todas = leerImagenes(zip)
  console.log(`${DRY ? '[DRY] ' : ''}Imágenes en la plantilla: ${todas.length}`)

  // Las de la columna de evidencia fotográfica, de la tabla hacia abajo.
  // Lo de arriba (fila 1) son logos de la cabecera.
  const deEpp = todas.filter(i => i.fila >= PRIMERA_FILA_DATOS && i.columna >= 3)
  console.log(`De la tabla de EPP (fila ≥ ${PRIMERA_FILA_DATOS}, col ≥ 3): ${deEpp.length}`)
  console.log(`Descartadas (logos y cabecera): ${todas.length - deEpp.length}\n`)

  const catalogo = await prisma.mppEppCatalogo.findMany({ orderBy: { orden: 'asc' } })
  console.log(`EPP en el catálogo: ${catalogo.length}`)

  // orden 1 → PRIMERA_FILA_DATOS, orden 2 → +1, …
  const porOrden = new Map<number, Imagen[]>()
  for (const img of deEpp) {
    const orden = img.fila - PRIMERA_FILA_DATOS + 1
    if (!porOrden.has(orden)) porOrden.set(orden, [])
    porOrden.get(orden)!.push(img)
  }

  const sinImagen = catalogo.filter(e => !porOrden.has(e.orden))
  const conVarias = [...porOrden.entries()].filter(([, v]) => v.length > 1)
  const sobrantes = [...porOrden.keys()].filter(o => !catalogo.some(e => e.orden === o))

  console.log(`Con imagen: ${catalogo.length - sinImagen.length} · sin imagen: ${sinImagen.length}`)
  if (conVarias.length) console.log(`Filas con más de una imagen: ${conVarias.map(([o, v]) => `orden ${o} (${v.length})`).join(', ')}`)
  if (sobrantes.length) console.log(`Imágenes en filas sin EPP en el catálogo: ${sobrantes.join(', ')}`)
  if (sinImagen.length) {
    console.log('\nEPP sin imagen:')
    for (const e of sinImagen) console.log(`  orden ${e.orden}: ${e.nombre}`)
  }

  console.log('\nMapeo (primeros 12):')
  for (const e of catalogo.slice(0, 12)) {
    const imgs = porOrden.get(e.orden)
    console.log(`  ${String(e.orden).padStart(2)} fila ${e.orden + PRIMERA_FILA_DATOS - 1}  ${imgs ? imgs.map(i => i.archivo).join(' + ') : '— sin imagen'}  ← ${e.nombre.slice(0, 42)}`)
  }

  if (DRY) { console.log('\nNada escrito.'); return }

  // Guardar en disco para revisarlas antes de subirlas a Drive: una foto mal
  // asignada en una matriz de EPP es peor que no tenerla.
  mkdirSync(SALIDA, { recursive: true })
  let guardadas = 0
  for (const e of catalogo) {
    const imgs = porOrden.get(e.orden)
    if (!imgs?.length) continue
    const img = imgs[0]
    const limpio = e.nombre.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60)
    writeFileSync(path.join(SALIDA, `${String(e.orden).padStart(2, '0')}_${limpio}.${img.ext}`), img.buffer)
    guardadas++
  }
  console.log(`\n${guardadas} imágenes guardadas en ${SALIDA}/ para revisar.`)
  if (SOLO_EXTRAER) return
  console.log('Revísalas y luego corre subir-imagenes-mpp-drive.ts para subirlas.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
