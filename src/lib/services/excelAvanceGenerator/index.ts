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
const SHEET2_RELS = 'xl/worksheets/_rels/sheet2.xml.rels'
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

  if (fotosOk.length > 0) {
    // b. Leyendas
    fotosOk.forEach((f) => setR(f.slot.leyendaCelda, f.leyenda))

    // a + c + d. media + drawing1.xml + rels
    const anchors: string[] = []
    const dRels: string[] = []
    const extsUsadas = new Set<string>()
    fotosOk.forEach((f, idx) => {
      const n = idx + 1
      const mediaName = `imgrep${n}.${f.ext}`
      files[`xl/media/${mediaName}`] = f.bytes
      extsUsadas.add(f.ext)
      const a = rangoAAncla(f.slot.anchorImagen) // { tl:{col,row}, br:{col,row} } 0-indexado
      anchors.push(
        `<xdr:twoCellAnchor editAs="oneCell">` +
          `<xdr:from><xdr:col>${a.tl.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.tl.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
          `<xdr:to><xdr:col>${a.br.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.br.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
          `<xdr:pic>` +
          `<xdr:nvPicPr><xdr:cNvPr id="${n}" name="Foto ${n}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
          `<xdr:blipFill><a:blip r:embed="rId${n}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
          `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>` +
          `</xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`,
      )
      dRels.push(
        `<Relationship Id="rId${n}" Type="${NS_R}/image" Target="../media/${mediaName}"/>`,
      )
    })
    files['xl/drawings/drawing1.xml'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_R}">` +
        anchors.join('') +
        `</xdr:wsDr>`,
    )
    files['xl/drawings/_rels/drawing1.xml.rels'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        dRels.join('') +
        `</Relationships>`,
    )

    // f. sheet2.xml.rels → relación al drawing
    const s2relsPrev = files[SHEET2_RELS] ? strFromU8(files[SHEET2_RELS]) : null
    const ridsExistentes = s2relsPrev ? [...s2relsPrev.matchAll(/Id="rId(\d+)"/g)].map((mm) => Number(mm[1])) : []
    const ridDraw = `rId${ridsExistentes.length ? Math.max(...ridsExistentes) + 1 : 1}`
    const drawRel = `<Relationship Id="${ridDraw}" Type="${NS_R}/drawing" Target="../drawings/drawing1.xml"/>`
    files[SHEET2_RELS] = strToU8(
      s2relsPrev
        ? s2relsPrev.replace('</Relationships>', drawRel + '</Relationships>')
        : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawRel}</Relationships>`,
    )

    // 4 + e. Asegurar xmlns:r en <worksheet> y añadir <drawing r:id=…/> antes de </worksheet>
    if (!/<worksheet[^>]*\sxmlns:r=/.test(sheet2Xml)) {
      sheet2Xml = sheet2Xml.replace(/<worksheet\b/, `<worksheet xmlns:r="${NS_R}"`)
    }
    sheet2Xml = sheet2Xml.replace('</worksheet>', `<drawing r:id="${ridDraw}"/></worksheet>`)

    // g. [Content_Types].xml → Default por extensión + Override del drawing
    let ct = strFromU8(files['[Content_Types].xml'])
    for (const ext of extsUsadas) {
      if (!new RegExp(`Extension="${ext}"`).test(ct)) {
        ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext}"/></Types>`)
      }
    }
    ct = ct.replace(
      '</Types>',
      `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`,
    )
    files['[Content_Types].xml'] = strToU8(ct)
  }

  // Devolver las hojas modificadas al ZIP y serializar.
  files[SHEET1] = strToU8(sheet1Xml)
  files[SHEET2] = strToU8(sheet2Xml)

  return Buffer.from(zipSync(files))
}
