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

/**
 * Tabla "TIPO DE EMISIÓN" como la referencia: encabezado Rev. | TE: Tipo de Emisión | Des. | Ver. | Apr. | Aut. | Fecha,
 * una fila por revisión, filas vacías hasta llenar la hoja ({#filasVacias}) y la
 * leyenda de firmantes en filas de la misma tabla ("JM: JESÚS MAMANI").
 * Se conservan el título y la fila de códigos de emisión.
 */
function tablaEmisionReferencia(xml: string): string {
  const i = xml.indexOf('TIPO DE EMISI')
  const inicio = xml.lastIndexOf('<w:tbl>', i)
  const fin = xml.indexOf('</w:tbl>', i)
  const tabla = xml.slice(inicio, fin)
  const filas = tabla.split('</w:tr>')
  const conservadas = filas.slice(0, 2).join('</w:tr>') + '</w:tr>' // título + códigos

  const ANCHOS = [700, 700, 4240, 800, 800, 800, 800, 800]
  const rPr = (sz: number, negrita = false, mayusculas = false) =>
    `<w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/>${negrita ? '<w:b/><w:bCs/>' : ''}${mayusculas ? '<w:caps/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
  const p = (texto: string, sz: number, { jc = 'center', negrita = false, mayusculas = false } = {}) =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="${jc}"/></w:pPr>${texto ? `<w:r>${rPr(sz, negrita, mayusculas)}<w:t xml:space="preserve">${texto}</w:t></w:r>` : ''}</w:p>`
  const tc = (ancho: number, contenido: string, { span = 1, sombreado = false } = {}) =>
    `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${sombreado ? '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>' : ''}` +
    `<w:tcMar><w:top w:w="20" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${contenido}</w:tc>`
  const tr = (celdas: string) => `<w:tr><w:trPr><w:trHeight w:val="440" w:hRule="atLeast"/></w:trPr>${celdas}</w:tr>`

  const encabezado = tr(
    tc(ANCHOS[0], p('Rev.', 22, { negrita: true }), { sombreado: true }) +
    tc(ANCHOS[1] + ANCHOS[2], p('TE: Tipo de Emisión', 22, { negrita: true }), { span: 2, sombreado: true }) +
    ['Des.', 'Ver.', 'Apr.', 'Aut.', 'Fecha'].map((t, k) => tc(ANCHOS[3 + k], p(t, 22, { negrita: true }), { sombreado: true })).join('')
  )
  const revision = tr(
    tc(ANCHOS[0], p('{#revisiones}{rev}', 18)) +
    tc(ANCHOS[1], p('{te}', 18)) +
    tc(ANCHOS[2], p('{descripcion}', 18, { jc: 'left' })) +
    ['{des}', '{ver}', '{apr}', '{aut}'].map((t, k) => tc(ANCHOS[3 + k], p(t, 16))).join('') +
    tc(ANCHOS[7], p('{fecha}{/revisiones}', 16))
  )
  const vacia = tr(
    tc(ANCHOS[0], p('{#filasVacias}', 18)) +
    ANCHOS.slice(1, 7).map(a => tc(a, p('', 18))).join('') +
    tc(ANCHOS[7], p('{/filasVacias}', 18))
  )
  const firmante = tr(
    tc(ANCHOS[0], p('{#firmantes}', 18)) +
    tc(ANCHOS[1], p('', 18)) +
    tc(ANCHOS.slice(2).reduce((a, b) => a + b, 0), p('{siglas}: {nombre}{/firmantes}', 20, { jc: 'left', mayusculas: true }), { span: 6 })
  )
  return xml.slice(0, inicio) + conservadas + encabezado + revision + vacia + firmante + xml.slice(fin)
}

/** Párrafo de lista con viñeta (numId 2 de la plantilla), sin espacio extra entre ítems como la referencia. */
const pVineta = (texto: string) =>
  `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="left"/></w:pPr>` +
  `<w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`
const pMarcador = (texto: string) =>
  `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`

/**
 * Cuadro de EPP como la referencia NEXA: en cada columna, subtítulos
 * subrayados ("EPP Generales:", "EPP Altura:"…) con su lista debajo.
 */
function tablaEppReferencia(xml: string): string {
  const i = xml.indexOf('{#eppBasico}')
  const inicio = xml.lastIndexOf('<w:tbl>', i)
  const fin = xml.indexOf('</w:tbl>', i)
  const tabla = xml.slice(inicio, fin)
  const finCabecera = tabla.indexOf('</w:tr>') + '</w:tr>'.length

  const columna = (loop: string) =>
    pMarcador(`{#${loop}}`) +
    `<w:p><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="120"/><w:jc w:val="left"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/><w:b/><w:bCs/><w:u w:val="single"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">{titulo}:</w:t></w:r></w:p>` +
    pMarcador('{#items}') + pVineta('{texto}') + pMarcador('{/items}') +
    pMarcador(`{/${loop}}`) +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>`
  const celda = (contenido: string) =>
    `<w:tc><w:tcPr><w:tcW w:w="4820" w:type="dxa"/><w:tcMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="top"/></w:tcPr>${contenido}</w:tc>`
  const fila = `<w:tr>${celda(columna('eppGruposBasico'))}${celda(columna('eppGruposRiesgo'))}</w:tr>`
  return xml.slice(0, inicio) + tabla.slice(0, finCabecera) + fila + xml.slice(fin)
}

/** Equipos / herramientas / materiales: solo el nombre (sin "— cantidad"), lista compacta y alineada arriba. */
function tablaRecursosReferencia(xml: string): string {
  const i = xml.indexOf('{#equipos}')
  const inicio = xml.lastIndexOf('<w:tbl>', i)
  const fin = xml.indexOf('</w:tbl>', i)
  const tabla = xml
    .slice(inicio, fin)
    .replace(/<w:p>(?:(?!<\/w:p>)[\s\S])*?\{nombre\} — \{cantidad\}[\s\S]*?<\/w:p>/g, () => pVineta('{texto}'))
    .replace(/(<w:tcPr>(?:(?!<\/w:tcPr>)[\s\S])*?)<w:vAlign w:val="center"\/>(<\/w:tcPr>)/g, (m, a, b) => (a.includes('w:shd') ? m : `${a}<w:vAlign w:val="top"/>${b}`))
  return xml.slice(0, inicio) + tabla + xml.slice(fin)
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
const docActual = zip.file('word/document.xml')!.asText()
if (!docActual.includes('{#filasVacias}')) {
  // Referencias: "{texto}" ya trae "código — título" o solo el título (sin " — " colgando).
  zip.file('word/document.xml', tablaEmisionReferencia(docActual).replace('{codigo} — {descripcion}', '{texto}'))
  cambios++
}
const docConEmision = zip.file('word/document.xml')!.asText()
if (!docConEmision.includes('{#eppGruposBasico}')) {
  zip.file('word/document.xml', tablaRecursosReferencia(tablaEppReferencia(docConEmision)))
  cambios++
}
const docConEpp = zip.file('word/document.xml')!.asText()
if (docConEpp.includes('{%histogramaEquipoPng}')) {
  // Histogramas como gráficos nativos de Word: marcador de texto que exportDocx reemplaza (graficosDocx.ts).
  zip.file('word/document.xml', docConEpp
    .replace('{%histogramaEquipoPng}', '{graficoEquipo}')
    .replace('{%histogramaHHPng}', '{graficoHH}')
    .replace('{%histogramaHHActividadPng}', '{graficoHHActividad}'))
  cambios++
}
/** Cambia la tabla que contiene `loop` por un párrafo con `marcador` (la arma exportDocx). */
function tablaPorMarcador(xml: string, loop: string, marcador: string): string {
  const i = xml.indexOf(loop)
  const inicio = xml.lastIndexOf('<w:tbl>', i)
  const fin = xml.indexOf('</w:tbl>', i) + '</w:tbl>'.length
  return xml.slice(0, inicio) + pMarcador(marcador) + xml.slice(fin)
}
const docConGraficos = zip.file('word/document.xml')!.asText()
if (docConGraficos.includes('{#histogramaEquipo}')) {
  // Tablas de histograma con una columna por mes (tablasHistogramaDocx.ts).
  zip.file('word/document.xml', tablaPorMarcador(
    tablaPorMarcador(docConGraficos, '{#histogramaEquipo}', '{tablaHistogramaEquipo}'),
    '{#histogramaHH}', '{tablaHistogramaHH}'
  ))
  cambios++
}
/**
 * Anexos en hoja horizontal: salto de sección antes del Anexo A (lo anterior
 * sigue vertical), encabezado NEXA ensanchado al ancho horizontal, y
 * marcadores para el organigrama con formas y el Gantt (organigramaDocx.ts,
 * ganttDocx.ts). Sin datos, cada anexo muestra lo de antes.
 */
function anexosHorizontales(z: PizZip): void {
  let xml = z.file('word/document.xml')!.asText()
  const subtitulo = (texto: string, nuevaPagina = false) =>
    `<w:p><w:pPr>${nuevaPagina ? '<w:pageBreakBefore/>' : ''}<w:keepNext/><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FUENTE}" w:cs="${FUENTE}" w:eastAsia="${FUENTE}" w:hAnsi="${FUENTE}"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`

  // Salto de sección (vertical) en lugar del salto de página previo al Anexo A.
  const iAnexoA = xml.indexOf('ANEXO A:')
  const inicioTitulo = xml.lastIndexOf('<w:p>', iAnexoA)
  const inicioSalto = xml.lastIndexOf('<w:p>', inicioTitulo - 1)
  if (!xml.slice(inicioSalto, inicioTitulo).includes('w:type="page"')) throw new Error('No se encontró el salto de página antes del Anexo A')
  const inicioSectFinal = xml.lastIndexOf('<w:sectPr>')
  const sectVertical = xml.slice(inicioSectFinal, xml.indexOf('</w:sectPr>', inicioSectFinal) + '</w:sectPr>'.length)
  xml = xml.slice(0, inicioSalto) + `<w:p><w:pPr>${sectVertical}</w:pPr></w:p>` + xml.slice(inicioTitulo)

  // La sección final (anexos) pasa a horizontal, con su propio encabezado.
  const sectHorizontal = sectVertical
    .replace(/<w:pgSz [^>]*\/>/, '<w:pgSz w:w="16837" w:h="11905" w:orient="landscape"/>')
    .replace(/(<w:headerReference w:type="default" r:id=")[^"]+"/, '$1rIdEncabezadoHorizontal"')
  const ultimo = xml.lastIndexOf(sectVertical)
  xml = xml.slice(0, ultimo) + sectHorizontal + xml.slice(ultimo + sectVertical.length)

  // Anexo A: organigrama con formas; si no hay, la imagen de antes.
  const iImg = xml.indexOf('{%organigramaPng}')
  const pImgIni = xml.lastIndexOf('<w:p>', iImg), pImgFin = xml.indexOf('</w:p>', iImg) + '</w:p>'.length
  xml = xml.slice(0, pImgIni) +
    pMarcador('{#tieneOrganigramaNativo}') + pMarcador('{organigramaNativo}') + pMarcador('{/tieneOrganigramaNativo}') +
    pMarcador('{^tieneOrganigramaNativo}') + xml.slice(pImgIni, pImgFin) + pMarcador('{/tieneOrganigramaNativo}') + xml.slice(pImgFin)

  // Anexo B: Gantt general por semanas + detalle por días; si no hay, la nota de antes.
  const iNota = xml.indexOf('El cronograma detallado del proyecto se adjunta')
  const pNotaIni = xml.lastIndexOf('<w:p>', iNota), pNotaFin = xml.indexOf('</w:p>', iNota) + '</w:p>'.length
  xml = xml.slice(0, pNotaIni) +
    pMarcador('{#tieneGantt}') +
    subtitulo('B.1 Cronograma general (por semanas)') + pMarcador('{ganttGeneral}') +
    pMarcador('{#tieneGanttDetalle}') + subtitulo('B.2 Detalle de Construcción y Comisionamiento (por días)', true) + pMarcador('{ganttDetalle}') + pMarcador('{/tieneGanttDetalle}') +
    pMarcador('{/tieneGantt}') +
    pMarcador('{^tieneGantt}') + xml.slice(pNotaIni, pNotaFin) + pMarcador('{/tieneGantt}') +
    xml.slice(pNotaFin)
  z.file('word/document.xml', xml)

  // Encabezado horizontal: el mismo de la referencia, con su tabla al ancho de la hoja horizontal.
  const factor = 14571 / 9640
  const escalar = (x: string) => x.replace(/(<w:(?:tblW|gridCol|tcW)\b[^>]*\bw:w=")(\d+)"/g, (_m, a, n) => `${a}${Math.round(Number(n) * factor)}"`)
  z.file('word/header2.xml', escalar(z.file('word/header1.xml')!.asText()))
  const relsHeader = z.file('word/_rels/header1.xml.rels')?.asText()
  if (relsHeader) z.file('word/_rels/header2.xml.rels', relsHeader)
  const rels = z.file('word/_rels/document.xml.rels')!.asText()
  z.file('word/_rels/document.xml.rels', rels.replace('</Relationships>',
    '<Relationship Id="rIdEncabezadoHorizontal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/></Relationships>'))
  const tipos = z.file('[Content_Types].xml')!.asText()
  z.file('[Content_Types].xml', tipos.replace('</Types>',
    '<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>'))
}
if (!zip.file('word/document.xml')!.asText().includes('{organigramaNativo}')) {
  anexosHorizontales(zip)
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
