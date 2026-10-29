import ExcelJS from 'exceljs'
import type PizZip from 'pizzip'
import type { PlanHistogramas } from '@/types/planTrabajo'
import { formatearMes } from './generarHistogramaPng'

/**
 * Histogramas de la sección 13 como gráficos NATIVOS de Word (los de
 * Insertar → Gráfico), no como imagen: se ven nítidos a cualquier zoom y se
 * editan en Word (clic derecho → Editar datos abre su hoja de Excel).
 *
 * La plantilla deja un marcador de texto (`{graficoEquipo}`…) donde va cada
 * gráfico; después del render, `insertarGraficosNativos` reemplaza el párrafo
 * del marcador por el gráfico y agrega sus partes al paquete: el XML del
 * gráfico (con los valores en caché, que es lo que Word dibuja) y el libro de
 * Excel embebido con los mismos datos.
 */

export type ClaveGrafico = 'equipo' | 'hh' | 'hhActividad'

export interface GraficoNativo {
  titulo: string
  categorias: string[]
  series: { nombre: string; valores: number[] }[]
  modo: 'agrupado' | 'apilado'
  /** Título del eje vertical. */
  ejeY: string
}

export const marcadorGrafico = (clave: ClaveGrafico) => `§GRAFICO:${clave}§`

/** Paleta de Office (la misma de los PNG anteriores), para que los colores no cambien. */
const COLORES = [
  '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5',
  '70AD47', '264478', '9E480E', '636363', '997300',
  '255E91', '43682B',
]
const FUENTE = 'Arial Narrow'
/** Ancho del cuerpo de la hoja (9640 twips) en EMU. */
const ANCHO_EMU = 9640 * 635

/** Mismas reglas de "hay datos" que los PNG: sin datos, el bloque del gráfico no se muestra. */
export function graficosDeHistogramas(h: PlanHistogramas): Record<ClaveGrafico, GraficoNativo | null> {
  const meses = h.meses.map(m => formatearMes(m, h.meses))
  const detalle = h.hhPorActividadConCmn
  return {
    equipo: h.meses.length > 0 && h.equipoTrabajo.length > 0
      ? { titulo: 'Histograma de Equipo de Trabajo', categorias: meses, modo: 'agrupado', ejeY: 'Personas',
          series: h.equipoTrabajo.map(f => ({ nombre: f.etiqueta, valores: f.valoresPorMes })) }
      : null,
    hh: h.meses.length > 0 && h.horasHombre.length > 0
      ? { titulo: 'Histograma de Horas-Hombre', categorias: meses, modo: 'apilado', ejeY: 'HH',
          series: h.horasHombre.map(f => ({ nombre: f.etiqueta, valores: f.valoresPorMes })) }
      : null,
    hhActividad: detalle && detalle.actividades.length > 0 && detalle.series.length > 0
      ? { titulo: 'Detalle HH por Actividad — Construcción y Comisionamiento', categorias: detalle.actividades, modo: 'apilado', ejeY: 'HH',
          series: detalle.series.map(s => ({ nombre: s.cargo, valores: s.valoresPorActividad })) }
      : null,
  }
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** 0 → "B" (la columna A son las categorías). */
function columna(indiceSerie: number): string {
  let n = indiceSerie + 2
  let letras = ''
  while (n > 0) {
    const r = (n - 1) % 26
    letras = String.fromCharCode(65 + r) + letras
    n = Math.floor((n - 1) / 26)
  }
  return letras
}

const txPr = (sz: number, negrita = false) =>
  `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${negrita ? 1 : 0}"><a:solidFill><a:srgbClr val="404040"/></a:solidFill><a:latin typeface="${FUENTE}"/><a:cs typeface="${FUENTE}"/></a:defRPr></a:pPr><a:endParaRPr lang="es-PE"/></a:p></c:txPr>`

const titulo = (texto: string, sz: number, vertical = false) =>
  `<c:title><c:tx><c:rich><a:bodyPr${vertical ? ' rot="-5400000" vert="horz"' : ''}/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="1"><a:latin typeface="${FUENTE}"/></a:defRPr></a:pPr><a:r><a:rPr lang="es-PE" sz="${sz}" b="1"><a:solidFill><a:srgbClr val="404040"/></a:solidFill><a:latin typeface="${FUENTE}"/><a:cs typeface="${FUENTE}"/></a:rPr><a:t>${esc(texto)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`

const LINEA_EJE = '<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="BFBFBF"/></a:solidFill></a:ln></c:spPr>'

export function xmlGrafico(g: GraficoNativo): string {
  const n = g.categorias.length
  const cats = `<c:cat><c:strRef><c:f>Hoja1!$A$2:$A$${n + 1}</c:f><c:strCache><c:ptCount val="${n}"/>${g.categorias.map((c, i) => `<c:pt idx="${i}"><c:v>${esc(c)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`
  const series = g.series.map((s, i) => {
    const col = columna(i)
    const vals = `<c:val><c:numRef><c:f>Hoja1!$${col}$2:$${col}$${n + 1}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${n}"/>${s.valores.map((v, k) => `<c:pt idx="${k}"><c:v>${Number(v) || 0}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>`
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:strRef><c:f>Hoja1!$${col}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(s.nombre)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
      `<c:spPr><a:solidFill><a:srgbClr val="${COLORES[i % COLORES.length]}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>${cats}${vals}</c:ser>`
  }).join('')
  const apilado = g.modo === 'apilado'

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:date1904 val="0"/><c:lang val="es-PE"/><c:roundedCorners val="0"/>` +
    `<c:chart>${titulo(g.titulo, 1200)}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>` +
    `<c:barChart><c:barDir val="col"/><c:grouping val="${apilado ? 'stacked' : 'clustered'}"/><c:varyColors val="0"/>${series}` +
    `<c:gapWidth val="${apilado ? 60 : 120}"/>${apilado ? '<c:overlap val="100"/>' : ''}<c:axId val="500000001"/><c:axId val="500000002"/></c:barChart>` +
    `<c:catAx><c:axId val="500000001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/>` +
    `<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${LINEA_EJE}${txPr(900)}<c:crossAx val="500000002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
    `<c:valAx><c:axId val="500000002"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>` +
    `<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E0E0E0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${titulo(g.ejeY, 900, true)}` +
    `<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900)}` +
    `<c:crossAx val="500000001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>` +
    `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>` +
    `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${txPr(800)}</c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>` +
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900)}` +
    `<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`
}

/** Libro con los mismos datos del gráfico (Hoja1: categorías en A, una serie por columna), para "Editar datos" en Word. */
export async function xlsxGrafico(g: GraficoNativo): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Hoja1')
  hoja.addRow(['', ...g.series.map(s => s.nombre)])
  g.categorias.forEach((c, i) => hoja.addRow([c, ...g.series.map(s => Number(s.valores[i]) || 0)]))
  return Buffer.from(await libro.xlsx.writeBuffer())
}

function parrafoGrafico(relId: string, docPrId: number, g: GraficoNativo): string {
  // Más alto si hay muchas categorías o series (etiquetas y leyenda ocupan más).
  const alto = Math.round(ANCHO_EMU * (g.categorias.length > 6 || g.series.length > 9 ? 0.62 : 0.52))
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${ANCHO_EMU}" cy="${alto}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${docPrId}" name="Gráfico ${docPrId}" descr="${esc(g.titulo)}"/><wp:cNvGraphicFramePr/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">` +
    `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${relId}"/>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

const TIPO_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
const TIPO_PACKAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package'
const CT_CHART = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'
const CT_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Reemplaza cada párrafo con marcador por su gráfico y agrega las partes al
 * paquete (chart, rels, xlsx, content types). Un marcador sin datos de
 * gráfico (no debería pasar: el bloque condicional lo oculta) se quita.
 */
export async function insertarGraficosNativos(
  zip: PizZip,
  documentXml: string,
  graficos: Partial<Record<ClaveGrafico, GraficoNativo | null>>
): Promise<string> {
  let xml = documentXml
  let rels = zip.file('word/_rels/document.xml.rels')!.asText()
  let tipos = zip.file('[Content_Types].xml')!.asText()
  let n = 0

  for (const clave of Object.keys(graficos) as ClaveGrafico[]) {
    const marcador = marcadorGrafico(clave)
    const re = new RegExp(`<w:p(?: [^>]*)?>(?:(?!</w:p>)[\\s\\S])*?${marcador}[\\s\\S]*?</w:p>`)
    const g = graficos[clave]
    while (re.test(xml)) {
      if (!g) {
        xml = xml.replace(re, '')
        continue
      }
      n++
      const nombre = `chartGys${n}`
      const relId = `rIdGraficoGys${n}`
      zip.file(`word/charts/${nombre}.xml`, xmlGrafico(g))
      zip.file(`word/embeddings/${nombre}.xlsx`, await xlsxGrafico(g))
      zip.file(`word/charts/_rels/${nombre}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${TIPO_PACKAGE}" Target="../embeddings/${nombre}.xlsx"/></Relationships>`)
      rels = rels.replace('</Relationships>', `<Relationship Id="${relId}" Type="${TIPO_CHART}" Target="charts/${nombre}.xml"/></Relationships>`)
      tipos = tipos.replace('</Types>', `<Override PartName="/word/charts/${nombre}.xml" ContentType="${CT_CHART}"/></Types>`)
      xml = xml.replace(re, parrafoGrafico(relId, 90000 + n, g))
    }
  }

  if (n > 0) {
    if (!tipos.includes('Extension="xlsx"')) tipos = tipos.replace('</Types>', `<Default Extension="xlsx" ContentType="${CT_XLSX}"/></Types>`)
    zip.file('word/_rels/document.xml.rels', rels)
    zip.file('[Content_Types].xml', tipos)
  }
  return xml
}
