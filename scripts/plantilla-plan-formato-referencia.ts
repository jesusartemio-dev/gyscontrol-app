/**
 * Aplica a la plantilla del plan de trabajo el formato del documento de
 * referencia aprobado por NEXA (data/formato-plan-trabajo/PN-I790126044-3GYS-0370COR0001-RC):
 * Arial Narrow, cuerpo 11 pt justificado, títulos negros (nivel 1 en mayúsculas).
 * Las tallas suben 1 pt en bloque (10→11, 9→10…): Arial Narrow es más angosta,
 * las tablas mantienen el ancho. Idempotente: no hace nada si ya está aplicado.
 * Uso: npx tsx scripts/plantilla-plan-formato-referencia.ts
 */
import fs from 'fs'
import path from 'path'
import PizZip from 'pizzip'

const PLANTILLA = path.join(process.cwd(), 'src/lib/services/planTrabajo/templates/plan-trabajo-nexa-template.docx')
const FUENTE = 'Arial Narrow'

const cambiarFuente = (xml: string) =>
  xml.replace(/w:(ascii|cs|eastAsia|hAnsi)="Arial"/g, `w:$1="${FUENTE}"`)

const subirTallas = (xml: string) =>
  xml.replace(/<w:(sz|szCs) w:val="(\d+)"\/>/g, (_, tag: string, v: string) => `<w:${tag} w:val="${Number(v) + 2}"/>`)

/** Párrafos sueltos (fuera de tablas, sin estilo ni alineación propia) → justificados, como el cuerpo de la referencia. */
function justificarCuerpo(xml: string): string {
  let profundidad = 0
  return xml.replace(/<w:tbl>|<\/w:tbl>|<w:p>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, m => {
    if (m === '<w:tbl>') { profundidad++; return m }
    if (m === '</w:tbl>') { profundidad--; return m }
    if (profundidad > 0 || !m.startsWith('<w:p><w:pPr>')) return m
    const pPr = m.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)![0]
    if (pPr.includes('<w:jc ') || /<w:pStyle w:val="(Heading|Title)/.test(pPr) || !m.includes('<w:t')) return m
    const nuevo = pPr.includes('<w:rPr>') ? pPr.replace('<w:rPr>', '<w:jc w:val="both"/><w:rPr>') : pPr.replace('</w:pPr>', '<w:jc w:val="both"/></w:pPr>')
    return m.replace(pPr, nuevo)
  })
}

function estilos(xml: string): string {
  let s = cambiarFuente(xml)
    .replace(/(<w:rPrDefault><w:rPr>[\s\S]*?)<w:sz w:val="20"\/><w:szCs w:val="20"\/>/, '$1<w:sz w:val="22"/><w:szCs w:val="22"/>')
  // Títulos en negro; el nivel 1 además en mayúsculas.
  for (const n of [1, 2, 3]) {
    s = s.replace(new RegExp(`(<w:style [^>]*w:styleId="Heading${n}">(?:(?!</w:style>)[\\s\\S])*?)<w:color w:val="[^"]*"/>`), `$1${n === 1 ? '<w:caps/>' : ''}<w:color w:val="000000"/>`)
  }
  return s
}

/**
 * Encabezado con la grilla de la referencia:
 *   logo                                   | NEXA RESOURCES / REFINERIA CAJAMARQUILLA
 *   ORDEN DE COMPRA x                      | Nº. NEXA: / código        | HOJA / n/N
 *   NOMBRE DEL PROYECTO x … (2 filas)      | Nº. CONSULTOR: / número   | REV. / X
 * Etiqueta en negrita y valor en la misma línea; se conservan logo, campos y tags.
 */
function encabezadoReferencia(xml: string): string {
  const logo = xml.match(/<w:drawing>[\s\S]*?<\/w:drawing>/)![0]
  const campoHoja = xml.match(/<w:fldChar w:fldCharType="begin"\/><w:instrText xml:space="preserve">PAGE<\/w:instrText>[\s\S]*?NUMPAGES[\s\S]*?<w:fldChar w:fldCharType="end"\/>/)![0]
  const [ANCHO_IZQ, ANCHO_MEDIO, ANCHO_DER] = [5315, 3333, 992]
  const rPr = (negrita: boolean) =>
    `<w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/>${negrita ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>`
  const run = (texto: string, negrita = false) => `<w:r>${rPr(negrita)}<w:t xml:space="preserve">${texto}</w:t></w:r>`
  const p = (runs: string, jc: 'left' | 'center' = 'left') =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${jc === 'center' ? '<w:jc w:val="center"/>' : ''}</w:pPr>${runs}</w:p>`
  // extra = gridSpan/vMerge (van antes de tcMar en el esquema); vAlign va al final.
  const tc = (ancho: number, contenido: string, extra = '', centradoVertical = false) =>
    `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${extra}<w:tcMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>${centradoVertical ? '<w:vAlign w:val="center"/>' : ''}</w:tcPr>${contenido}</w:tc>`
  const borde = '<w:top w:val="single" w:color="auto" w:sz="4"/><w:left w:val="single" w:color="auto" w:sz="4"/><w:bottom w:val="single" w:color="auto" w:sz="4"/><w:right w:val="single" w:color="auto" w:sz="4"/><w:insideH w:val="single" w:color="auto" w:sz="4"/><w:insideV w:val="single" w:color="auto" w:sz="4"/>'

  const fila1 =
    `<w:tr>` +
    tc(ANCHO_IZQ, `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r>${logo}</w:r></w:p>`, '', true) +
    tc(ANCHO_MEDIO + ANCHO_DER, p(run('NEXA RESOURCES', true), 'center') + p(run('REFINERIA CAJAMARQUILLA', true), 'center'), '<w:gridSpan w:val="2"/>', true) +
    `</w:tr>`
  const fila2 =
    `<w:tr>` +
    tc(ANCHO_IZQ,
      p(run('ORDEN DE COMPRA ', true) + run('{ordenCompra}')) +
      p(run('NOMBRE DEL PROYECTO ', true) + run('{nombreProyecto}')) +
      p(run('TIPO DE DOCUMENTO/TÍTULO DEL DOCUMENTO', true)) +
      p(run('PLAN DE TRABAJO')),
      '<w:vMerge w:val="restart"/>') +
    tc(ANCHO_MEDIO, p(run('Nº. NEXA:', true)) + p(run('{codigoDocumento}'), 'center')) +
    tc(ANCHO_DER, p(run('HOJA', true), 'center') + p(`<w:r>${rPr(false)}${campoHoja}</w:r>`, 'center')) +
    `</w:tr>`
  const fila3 =
    `<w:tr>` +
    tc(ANCHO_IZQ, '<w:p/>', '<w:vMerge/>') +
    tc(ANCHO_MEDIO, p(run('Nº. CONSULTOR:', true)) + p(run('{numeroConsultor}'), 'center')) +
    tc(ANCHO_DER, p(run('REV.', true), 'center') + p(run('{revision}'), 'center')) +
    `</w:tr>`
  const tabla =
    `<w:tbl><w:tblPr><w:tblW w:w="${ANCHO_IZQ + ANCHO_MEDIO + ANCHO_DER}" w:type="dxa"/><w:tblBorders>${borde}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="${ANCHO_IZQ}"/><w:gridCol w:w="${ANCHO_MEDIO}"/><w:gridCol w:w="${ANCHO_DER}"/></w:tblGrid>` +
    fila1 + fila2 + fila3 + `</w:tbl>`
  return xml.replace(/<w:tbl>[\s\S]*<\/w:tbl>/, tabla)
}

const zip = new PizZip(fs.readFileSync(PLANTILLA))
const doc = zip.file('word/document.xml')!.asText()
let cambios = 0
if (doc.includes('w:ascii="Arial"')) {
  // Índice solo con las secciones numeradas (nivel 1), como la referencia.
  const conIndiceNivel1 = doc.replace('TOC \\h \\o &quot;1-2&quot;', 'TOC \\o &quot;1-1&quot; \\h')
  zip.file('word/document.xml', justificarCuerpo(subirTallas(cambiarFuente(conIndiceNivel1))))
  for (const f of ['word/header1.xml', 'word/footer1.xml']) {
    const x = zip.file(f)?.asText()
    if (x) zip.file(f, subirTallas(cambiarFuente(x)))
  }
  zip.file('word/styles.xml', estilos(zip.file('word/styles.xml')!.asText()))
  cambios++
}
const encabezado = zip.file('word/header1.xml')!.asText()
if (!encabezado.includes('<w:vMerge')) {
  zip.file('word/header1.xml', encabezadoReferencia(encabezado))
  cambios++
}
if (cambios === 0) {
  console.log('La plantilla ya tiene el formato de referencia.')
  process.exit(0)
}
// Los textos multilínea llegan como <w:br/> (linebreaks de docxtemplater): sin esto, al
// justificar, la línea antes de cada salto se estira de margen a margen.
const settings = zip.file('word/settings.xml')!.asText()
if (!settings.includes('doNotExpandShiftReturn')) {
  zip.file('word/settings.xml', settings.replace('<w:compat>', '<w:compat><w:doNotExpandShiftReturn/>'))
}
fs.writeFileSync(PLANTILLA, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log('Plantilla actualizada:', PLANTILLA)
