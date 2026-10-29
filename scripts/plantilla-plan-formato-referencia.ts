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

const zip = new PizZip(fs.readFileSync(PLANTILLA))
const doc = zip.file('word/document.xml')!.asText()
if (!doc.includes('w:ascii="Arial"')) {
  console.log('La plantilla ya tiene el formato de referencia.')
  process.exit(0)
}

// Índice solo con las secciones numeradas (nivel 1), como la referencia.
const conIndiceNivel1 = doc.replace('TOC \\h \\o &quot;1-2&quot;', 'TOC \\o &quot;1-1&quot; \\h')
zip.file('word/document.xml', justificarCuerpo(subirTallas(cambiarFuente(conIndiceNivel1))))
for (const f of ['word/header1.xml', 'word/footer1.xml']) {
  const x = zip.file(f)?.asText()
  if (x) zip.file(f, subirTallas(cambiarFuente(x)))
}
zip.file('word/styles.xml', estilos(zip.file('word/styles.xml')!.asText()))
// Los textos multilínea llegan como <w:br/> (linebreaks de docxtemplater): sin esto, al
// justificar, la línea antes de cada salto se estira de margen a margen.
const settings = zip.file('word/settings.xml')!.asText()
if (!settings.includes('doNotExpandShiftReturn')) {
  zip.file('word/settings.xml', settings.replace('<w:compat>', '<w:compat><w:doNotExpandShiftReturn/>'))
}
fs.writeFileSync(PLANTILLA, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log('Plantilla actualizada:', PLANTILLA)
