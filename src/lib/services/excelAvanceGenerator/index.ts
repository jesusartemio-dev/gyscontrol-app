import path from 'path'
import { readFileSync } from 'fs'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'
import type { ReporteAvanceAgregado } from '@/lib/services/reporteAvance'
import {
  CELDAS_DATOS,
  CELDAS_REPORTE,
  HITOS,
  RESUMEN_FASES,
  VARIACIONES,
  IMPEDIMENTOS,
  FOTOS_SLOTS,
  type AggView,
} from './mapping'
import { diasEntre, normalizarFase, extensionDesdeMime, rangoAAncla } from './helpers'
import { inyectarHojaAvance, inyectarHojaCurvaS } from './avanceSheets'
import { obtenerArbolAvanceConPesos } from '@/lib/services/arbolAvance'

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'services',
  'excelAvanceGenerator',
  'template',
  'reporte-semanal-avance.template.xlsx',
)

const LOTE_FOTOS = 4
const SHEET1 = 'xl/worksheets/sheet1.xml' // Datos
const SHEET2 = 'xl/worksheets/sheet2.xml' // Reporte
const EPOCH_EXCEL = Date.UTC(1899, 11, 30) // serial 0 (sistema 1900 con el bug de bisiesto compensado)

const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// ─── Helpers de manipulación XML ─────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Letra(s) de columna → índice 0-based (A=0, B=1, … AA=26). */
function colToNum0(letras: string): number {
  let n = 0
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Fecha JS → serial de Excel (entero de día). */
function excelSerial(d: Date): number {
  return Math.floor((d.getTime() - EPOCH_EXCEL) / 86_400_000)
}

/**
 * Escribe un valor en la celda `ref` del XML de una hoja, conservando el estilo (s="N")
 * de la celda existente. Si la celda no existe la inserta en su fila (en orden de
 * columna); si la fila no existe la crea (en orden de fila).
 *  - 'str' → inlineStr ; 'num'/'date' → <v>número</v> (la fecha ya viene como serial).
 */
function setCell(xml: string, ref: string, kind: 'str' | 'num' | 'date', value: string | number): string {
  const m = ref.match(/^([A-Z]+)(\d+)$/)
  if (!m) return xml
  const rowNum = m[2]
  const targetCol = colToNum0(m[1])

  const build = (style: string) =>
    kind === 'str'
      ? `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
      : `<c r="${ref}"${style}><v>${value}</v></c>`

  // 1. ¿Existe la celda? (con /> o con contenido …</c>)
  const cellRe = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  const cm = cellRe.exec(xml)
  if (cm) {
    const s = cm[1].match(/\bs="(\d+)"/)
    return xml.slice(0, cm.index) + build(s ? ` s="${s[1]}"` : '') + xml.slice(cm.index + cm[0].length)
  }

  const cellNew = build('')

  // 2. La celda no existe → insertar en su <row>
  const rowRe = new RegExp(`(<row r="${rowNum}"[^>]*>)([\\s\\S]*?)(</row>)`)
  const rm = rowRe.exec(xml)
  if (rm) {
    const inner = rm[2]
    const tags = inner.match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) ?? []
    let pos = inner.length
    for (const tag of tags) {
      const cr = tag.match(/<c r="([A-Z]+)\d+"/)
      if (cr && colToNum0(cr[1]) > targetCol) {
        pos = inner.indexOf(tag)
        break
      }
    }
    const newInner = inner.slice(0, pos) + cellNew + inner.slice(pos)
    return xml.slice(0, rm.index) + rm[1] + newInner + rm[3] + xml.slice(rm.index + rm[0].length)
  }

  // 3. La fila no existe → crearla en orden dentro de <sheetData>
  const newRow = `<row r="${rowNum}">${cellNew}</row>`
  const rowsRe = /<row r="(\d+)"[^>]*>/g
  let mt: RegExpExecArray | null
  let insertPos = -1
  while ((mt = rowsRe.exec(xml))) {
    if (Number(mt[1]) > Number(rowNum)) {
      insertPos = mt.index
      break
    }
  }
  if (insertPos === -1) {
    const sd = xml.indexOf('</sheetData>')
    if (sd === -1) return xml
    return xml.slice(0, sd) + newRow + xml.slice(sd)
  }
  return xml.slice(0, insertPos) + newRow + xml.slice(insertPos)
}

/** Detecta el kind por el tipo del valor y delega en setCell (null/''/NaN → no escribe). */
function escribir(xml: string, ref: string, value: unknown): string {
  if (value === null || value === undefined) return xml
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return xml
    return setCell(xml, ref, 'date', excelSerial(value))
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return xml
    return setCell(xml, ref, 'num', value)
  }
  if (typeof value === 'string') {
    if (value === '') return xml
    return setCell(xml, ref, 'str', value)
  }
  return xml
}

// ─── Logos del encabezado (siempre incrustados) ──────────────────────────────

const LOGO_DIR = path.join(process.cwd(), 'src', 'lib', 'services', 'excelAvanceGenerator', 'logos')

interface PosLogo { col: number; row: number; colOff: number; rowOff: number; cx: number; cy: number }
interface LogoSpec { archivo: string; media: string; nombre: string; pos: PosLogo }

const LOGOS_DATOS: LogoSpec[] = [
  { archivo: 'logo-supervision.png', media: 'logosupervision.png', nombre: 'Logo Supervision', pos: { col: 1, row: 2, colOff: 38100, rowOff: 19050, cx: 904875, cy: 352425 } },
  { archivo: 'logo-cliente.png', media: 'logocliente.png', nombre: 'Logo Cliente', pos: { col: 8, row: 2, colOff: 161925, rowOff: 57150, cx: 895350, cy: 276225 } },
  { archivo: 'logo-contratista.png', media: 'logocontratista.png', nombre: 'Logo Contratista', pos: { col: 9, row: 2, colOff: 104775, rowOff: 76200, cx: 771525, cy: 219075 } },
]
const LOGOS_REPORTE: LogoSpec[] = [
  { archivo: 'logo-contratista.png', media: 'logocontratista.png', nombre: 'Logo Contratista', pos: { col: 1, row: 1, colOff: 9525, rowOff: 9525, cx: 1676400, cy: 533400 } },
  { archivo: 'logo-cliente.png', media: 'logocliente.png', nombre: 'Logo Cliente', pos: { col: 12, row: 0, colOff: 514350, rowOff: 171450, cx: 2600325, cy: 1038225 } },
]

/** Ancla de tamaño fijo (logos): oneCellAnchor con <xdr:ext cx cy>. */
function anclaOneCell(p: PosLogo, cNvId: number, rId: number, nombre: string): string {
  return (
    `<xdr:oneCellAnchor>` +
    `<xdr:from><xdr:col>${p.col}</xdr:col><xdr:colOff>${p.colOff}</xdr:colOff><xdr:row>${p.row}</xdr:row><xdr:rowOff>${p.rowOff}</xdr:rowOff></xdr:from>` +
    `<xdr:ext cx="${p.cx}" cy="${p.cy}"/>` +
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${cNvId}" name="${nombre}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
    `<xdr:blipFill><a:blip r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
    `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${p.cx}" cy="${p.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>` +
    `</xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`
  )
}

/** Ancla de dos celdas (fotos), a partir de un rango 'C72:E80'. */
function anclaTwoCell(rango: string, cNvId: number, rId: number, nombre: string): string {
  const a = rangoAAncla(rango)
  return (
    `<xdr:twoCellAnchor editAs="oneCell">` +
    `<xdr:from><xdr:col>${a.tl.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.tl.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${a.br.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.br.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${cNvId}" name="${nombre}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
    `<xdr:blipFill><a:blip r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
    `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>` +
    `</xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`
  )
}

/** Imagen a colocar en un drawing: media (dedup por nombre) + función que arma su ancla. */
interface Imagen {
  media: string
  bytes: Uint8Array
  ext: string
  ancla: (cNvId: number, rId: number) => string
}

// ─── Generador ───────────────────────────────────────────────────────────────

interface FotoOk {
  slot: (typeof FOTOS_SLOTS)[number]
  leyenda: string
  bytes: Uint8Array
  ext: 'png' | 'jpeg'
}

/**
 * Genera el Reporte Semanal de Avance (.xlsx) inyectando valores y fotos directamente en
 * el XML/ZIP de la plantilla con fflate (sin ExcelJS, que corrompía la hoja "Reporte" al
 * re-serializarla). Conserva intactas las partes de la plantilla.
 */
export async function generarExcelReporteAvance(agg: ReporteAvanceAgregado): Promise<Buffer> {
  // 1. Abrir la plantilla.
  const files: Record<string, Uint8Array> = unzipSync(new Uint8Array(readFileSync(TEMPLATE_PATH)))
  for (const k of Object.keys(files)) if (k.endsWith('/')) delete files[k] // entradas de directorio

  let sheet1Xml = strFromU8(files[SHEET1])
  let sheet2Xml = strFromU8(files[SHEET2])
  const setD = (ref: string, v: unknown) => { sheet1Xml = escribir(sheet1Xml, ref, v) }
  const setR = (ref: string, v: unknown) => { sheet2Xml = escribir(sheet2Xml, ref, v) }

  const view: AggView = agg

  // 2/5. Escalares (Datos y Reporte) — mismas celdas y reglas del mapping.
  for (const [ref, fn] of Object.entries(CELDAS_DATOS)) setD(ref, fn(view))
  for (const [ref, fn] of Object.entries(CELDAS_REPORTE)) setR(ref, fn(view))

  // HITOS
  const hc = HITOS.columnas
  const escribirHito = (h: ReporteAvanceAgregado['hitos'][number], fila: number) => {
    setR(`${hc.nombre}${fila}`, h.nombre)
    setR(`${hc.plan}${fila}`, h.fechaPlan)
    setR(`${hc.pronostico}${fila}`, h.fechaPronostico)
    setR(`${hc.real}${fila}`, h.fechaReal)
    const base = h.fechaReal ?? h.fechaPronostico
    setR(`${hc.variacion}${fila}`, base && h.fechaPlan ? diasEntre(base, h.fechaPlan) : undefined)
    setR(`${hc.comentario}${fila}`, h.comentario)
  }
  agg.hitos
    .filter((h) => h.tipo === 'contractual')
    .slice(0, HITOS.filasContractuales.length)
    .forEach((h, i) => escribirHito(h, HITOS.filasContractuales[i]))
  agg.hitos
    .filter((h) => h.tipo === 'intermedio')
    .slice(0, HITOS.filasIntermedios.length)
    .forEach((h, i) => escribirHito(h, HITOS.filasIntermedios[i]))

  // RESUMEN (% real acumulado como fracción)
  const filasResumen = RESUMEN_FASES.filasPorFase as Record<string, number>
  for (const f of agg.avancePorFase) {
    const fila = filasResumen[normalizarFase(f.nombre)]
    if (fila) setR(`${RESUMEN_FASES.columnas.realAcumulado}${fila}`, f.porcentajeAvance / 100)
  }

  // VARIACIONES (causa de texto)
  const filasVariaciones = VARIACIONES.filasPorFase as Record<string, number>
  for (const v of agg.variaciones) {
    const fila = filasVariaciones[normalizarFase(v.fase)]
    if (fila) setR(`${VARIACIONES.columnas.causa}${fila}`, v.causa)
  }

  // IMPEDIMENTOS (8 máx)
  agg.impedimentos.slice(0, IMPEDIMENTOS.filas.length).forEach((imp, i) => {
    const fila = IMPEDIMENTOS.filas[i]
    setR(`${IMPEDIMENTOS.columnas.restriccion}${fila}`, imp.restriccion)
    if (imp.responsable) setR(`${IMPEDIMENTOS.columnas.responsable}${fila}`, imp.responsable)
    if (imp.fechaLimite) {
      const dl = new Date(imp.fechaLimite)
      if (!Number.isNaN(dl.getTime())) setR(`${IMPEDIMENTOS.columnas.fechaLimite}${fila}`, dl)
    }
  })

  // 6. FOTOS — descarga (lotes) y luego inyección directa en el ZIP.
  const fotosUsar = agg.fotos.slice(0, FOTOS_SLOTS.length)
  const descargas: (FotoOk | null)[] = new Array(fotosUsar.length).fill(null)
  for (let i = 0; i < fotosUsar.length; i += LOTE_FOTOS) {
    const lote = fotosUsar.slice(i, i + LOTE_FOTOS)
    const res = await Promise.all(
      lote.map(async (f) => {
        try {
          return await descargarBufferDrive(f.driveFileId)
        } catch {
          return null
        }
      }),
    )
    res.forEach((r, j) => {
      if (!r) return
      const k = i + j
      descargas[k] = {
        slot: FOTOS_SLOTS[k],
        leyenda: fotosUsar[k].leyenda ?? fotosUsar[k].registroDescripcion ?? '',
        bytes: new Uint8Array(r.buffer),
        ext: extensionDesdeMime(r.mimeType),
      }
    })
  }
  const fotosOk = descargas.filter((x): x is FotoOk => x != null)

  // Leyendas de las fotos (celdas de la hoja Reporte).
  fotosOk.forEach((f) => setR(f.slot.leyendaCelda, f.leyenda))

  // 7. DRAWINGS — logos SIEMPRE + fotos. Cada hoja referencia UN solo drawing.
  let drawingSeq = 0
  const mediaAgregada = new Set<string>()
  const extsUsadas = new Set<string>()
  const ctOverrides: string[] = []

  /**
   * Escribe un drawing en una hoja: media (dedup por nombre), drawingN.xml + sus rels,
   * la relación en sheetN.xml.rels (la crea si falta), y xmlns:r + <drawing> en la hoja.
   * Devuelve el XML de la hoja actualizado. cNvPr id y rId únicos dentro del drawing.
   */
  function escribirDrawing(sheetNum: number, sheetXml: string, imagenes: Imagen[]): string {
    if (imagenes.length === 0) return sheetXml
    drawingSeq += 1

    const anchors: string[] = []
    const rels: string[] = []
    imagenes.forEach((img, idx) => {
      const rId = idx + 1
      const cNvId = idx + 2 // único por drawing, >1
      if (!mediaAgregada.has(img.media)) {
        files[`xl/media/${img.media}`] = img.bytes
        mediaAgregada.add(img.media)
      }
      extsUsadas.add(img.ext)
      anchors.push(img.ancla(cNvId, rId))
      rels.push(`<Relationship Id="rId${rId}" Type="${NS_R}/image" Target="../media/${img.media}"/>`)
    })

    files[`xl/drawings/drawing${drawingSeq}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_R}">` +
        anchors.join('') +
        `</xdr:wsDr>`,
    )
    files[`xl/drawings/_rels/drawing${drawingSeq}.xml.rels`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        rels.join('') +
        `</Relationships>`,
    )

    const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetNum}.xml.rels`
    const prev = files[sheetRelsPath] ? strFromU8(files[sheetRelsPath]) : null
    const idsPrev = prev ? [...prev.matchAll(/Id="rId(\d+)"/g)].map((mm) => Number(mm[1])) : []
    const ridDraw = `rId${idsPrev.length ? Math.max(...idsPrev) + 1 : 1}`
    const drawRel = `<Relationship Id="${ridDraw}" Type="${NS_R}/drawing" Target="../drawings/drawing${drawingSeq}.xml"/>`
    files[sheetRelsPath] = strToU8(
      prev
        ? prev.replace('</Relationships>', drawRel + '</Relationships>')
        : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawRel}</Relationships>`,
    )

    ctOverrides.push(
      `<Override PartName="/xl/drawings/drawing${drawingSeq}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    )

    let out = sheetXml
    if (!/<worksheet[^>]*\sxmlns:r=/.test(out)) out = out.replace(/<worksheet\b/, `<worksheet xmlns:r="${NS_R}"`)
    return out.replace('</worksheet>', `<drawing r:id="${ridDraw}"/></worksheet>`)
  }

  // Logos en memoria (uno por archivo, reutilizados entre hojas).
  const logoCache = new Map<string, Uint8Array>()
  const cargarLogo = (archivo: string): Uint8Array => {
    let b = logoCache.get(archivo)
    if (!b) {
      b = new Uint8Array(readFileSync(path.join(LOGO_DIR, archivo)))
      logoCache.set(archivo, b)
    }
    return b
  }

  // Datos (sheet1): drawing con los 3 logos.
  const imgsDatos: Imagen[] = LOGOS_DATOS.map((l) => ({
    media: l.media,
    bytes: cargarLogo(l.archivo),
    ext: 'png',
    ancla: (cNvId: number, rId: number) => anclaOneCell(l.pos, cNvId, rId, l.nombre),
  }))
  sheet1Xml = escribirDrawing(1, sheet1Xml, imgsDatos)

  // Reporte (sheet2): fotos (twoCell) + 2 logos (oneCell) en el MISMO drawing.
  const imgsReporte: Imagen[] = [
    ...fotosOk.map((f, idx) => ({
      media: `imgrepfoto${idx + 1}.${f.ext}`,
      bytes: f.bytes,
      ext: f.ext,
      ancla: (cNvId: number, rId: number) => anclaTwoCell(f.slot.anchorImagen, cNvId, rId, `Foto ${idx + 1}`),
    })),
    ...LOGOS_REPORTE.map((l) => ({
      media: l.media,
      bytes: cargarLogo(l.archivo),
      ext: 'png',
      ancla: (cNvId: number, rId: number) => anclaOneCell(l.pos, cNvId, rId, l.nombre),
    })),
  ]
  sheet2Xml = escribirDrawing(2, sheet2Xml, imgsReporte)

  // [Content_Types].xml: Default por extensión usada + Overrides de los drawings.
  if (extsUsadas.size > 0) {
    let ct = strFromU8(files['[Content_Types].xml'])
    for (const ext of extsUsadas) {
      if (!new RegExp(`Extension="${ext}"`).test(ct)) {
        ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext}"/></Types>`)
      }
    }
    ct = ct.replace('</Types>', ctOverrides.join('') + '</Types>')
    files['[Content_Types].xml'] = strToU8(ct)
  }

  // 8. HOJAS Avance (sheet3) + Curva S (sheet4) — matriz jerárquica con pesos y cuadro.
  //    Usa el árbol de ejecución+baseline con pesos (una sola fuente). No toca Datos/Reporte.
  try {
    const arbol = await obtenerArbolAvanceConPesos(agg.cabecera.proyecto.id)
    inyectarHojaAvance(files, arbol)
    inyectarHojaCurvaS(files)
  } catch (e) {
    console.warn('[excelAvanceGenerator] hoja Avance/Curva S falló, se omite:', e)
  }

  // Devolver las hojas modificadas al ZIP y serializar.
  files[SHEET1] = strToU8(sheet1Xml)
  files[SHEET2] = strToU8(sheet2Xml)

  return Buffer.from(zipSync(files))
}
