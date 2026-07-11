/**
 * `{hoja}` ya vive dentro de un campo Word real (`PAGE`) en la plantilla — solo
 * hace falta reemplazar el texto de resultado cacheado por un valor semilla ("1"),
 * Word lo recalcula solo al abrir/imprimir/F9. `{totalHojas}` NO tiene campo
 * (`NUMPAGES`) — hay que construírselo, reusando el `<w:rPr>` del run original
 * para no perder la fuente/tamaño.
 */
/**
 * Apertura de un RUN real `<w:r>`/`<w:r ...>` — nunca `<w:rPr>`, `<w:rFonts>`,
 * `<w:rStyle>` ni otro elemento cuyo nombre simplemente empiece con "r". Tras
 * "<w:r" debe venir inmediatamente `>` (run vacío) o un espacio (atributos),
 * nunca otra letra — ese fue el bug real: `<w:r[^>]*>` matcheaba `<w:rPr>` por
 * "accidente" (r + "Pr" + ">" calza el patrón), dejando el <w:r>/<w:rPr>
 * originales sin cerrar y generando un .docx que Word rechaza por completo.
 */
const RX_APERTURA_RUN = /<w:r(?:>|\s[^>]*>)/g

export function insertarCamposPaginacion(xml: string): string {
  if (!xml.includes('{hoja}')) {
    throw new Error('[plantilla-oficial] No se encontró {hoja} en header1.xml.')
  }
  const resultado = xml.replace('{hoja}', '1')

  const marcadorIdx = resultado.indexOf('{totalHojas}')
  if (marcadorIdx === -1) {
    throw new Error('[plantilla-oficial] No se encontró {totalHojas} en header1.xml.')
  }

  let inicioRun = -1
  RX_APERTURA_RUN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = RX_APERTURA_RUN.exec(resultado)) !== null) {
    if (match.index > marcadorIdx) break
    inicioRun = match.index
  }
  if (inicioRun === -1) {
    throw new Error('[plantilla-oficial] No se encontró la apertura <w:r> del run de {totalHojas} en header1.xml.')
  }

  // `</w:r>` es una búsqueda de substring segura (no ambigua con `</w:rPr>`):
  // el carácter siguiente a "r" en el literal es ">" exacto, `</w:rPr>` tiene
  // "P" ahí — nunca calzan por accidente.
  const CIERRE_RUN = '</w:r>'
  const finRunIdx = resultado.indexOf(CIERRE_RUN, marcadorIdx)
  if (finRunIdx === -1) {
    throw new Error('[plantilla-oficial] No se encontró el cierre </w:r> del run de {totalHojas} en header1.xml.')
  }
  const finRun = finRunIdx + CIERRE_RUN.length

  const runOriginal = resultado.slice(inicioRun, finRun)
  const rPrMatch = runOriginal.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
  const rPr = rPrMatch ? rPrMatch[0] : ''

  // Runs HERMANOS a nivel de párrafo (nunca anidados) — cada uno con su propio
  // <w:rPr> copiado, para que "1/2" mantenga la tipografía del encabezado.
  const campoNumPages =
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r>${rPr}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r>${rPr}<w:t>1</w:t></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`

  return resultado.slice(0, inicioRun) + campoNumPages + resultado.slice(finRun)
}
