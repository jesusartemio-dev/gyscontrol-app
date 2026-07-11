/**
 * La plantilla oficial de cliente (plantilla_matriz_comunicacion.docx) trae UNA
 * celda marcador `{_siglas_}` (fila de siglas) y UNA celda marcador `{_codigo_}`
 * (fila de datos, dentro de `{#filas}`) para la sección "RESPONSABILIDAD" de la
 * tabla — docxtemplater no soporta columnas dinámicas (solo filas), así que este
 * módulo clona esas celdas N veces (N = cantidad de personas de la matriz) ANTES
 * de pasar el XML a docxtemplater. Opera con reemplazos de texto sobre el XML
 * crudo (nunca un parser DOM) porque los hallazgos de la inspección manual del
 * .docx confirman que los tags son runs de texto sin fragmentar y que `<w:tc>`
 * no anida — un reemplazo de string es seguro y muchísimo más simple que parsear
 * OOXML completo para esta única transformación puntual.
 *
 * Estructura real verificada (no volver a re-derivar sin inspeccionar de nuevo
 * el .docx si esto se toca):
 * - La fila de siglas (`{_siglas_}`) está INMEDIATAMENTE antes de la fila de
 *   datos (`{#filas}{id}...{_codigo_}`) — sin fila estática entre medio.
 * - La celda `{_codigo_}` es la ÚLTIMA celda de la ÚLTIMA fila de la tabla
 *   (`</w:tc></w:tr></w:tbl>` justo después) — ahí se inyecta `{/filas}`, que
 *   la plantilla NO trae (confirmado por grep — no existe en ningún lado).
 * - `tblGrid` tiene 4 columnas fijas (ID/ACTIVIDAD/FRECUENCIA/MEDIO) + un
 *   presupuesto de columnas "de respaldo" para la responsabilidad, que hay que
 *   redistribuir entre las N columnas reales.
 * - El header "RESPONSABILIDAD" tiene `gridSpan=1` — hay que subirlo a N.
 */

export const siglasTagName = (i: number) => `siglas_${i}`
export const codigoTagName = (i: number) => `codigo_${i}`

const MARCADOR_SIGLAS = '{_siglas_}'
const MARCADOR_CODIGO = '{_codigo_}'

/** Extrae el bloque `<w:tc>...</w:tc>` que contiene el marcador dado — estas celdas nunca tienen atributos en la propia etiqueta `<w:tc>` (los atributos viven en `<w:tcPr>`), así que buscar el `<w:tc>` bare inmediatamente anterior es seguro. */
function extraerBloqueTc(xml: string, marcador: string): string {
  const idx = xml.indexOf(marcador)
  if (idx === -1) {
    throw new Error(`[matriz-plantilla] Marcador "${marcador}" no encontrado en document.xml — la plantilla pudo haber sido editada en Word y los runs se fragmentaron.`)
  }
  const inicio = xml.lastIndexOf('<w:tc>', idx)
  const finMarcador = xml.indexOf('</w:tc>', idx)
  if (inicio === -1 || finMarcador === -1) {
    throw new Error(`[matriz-plantilla] No se pudo delimitar la celda <w:tc> del marcador "${marcador}" — estructura de la plantilla inesperada.`)
  }
  return xml.slice(inicio, finMarcador + '</w:tc>'.length)
}

/** Reemplaza el único atributo de ancho (`w:tcW w:w="..."`) de un bloque de celda ya extraído. */
function conAncho(bloqueTc: string, anchoDxa: number): string {
  return bloqueTc.replace(/(<w:tcW w:w=")\d+(")/, `$1${anchoDxa}$2`)
}

export interface ResultadoExpansionColumnas {
  documentXml: string
  /** siglas_0..N-1 -> valor real (dato de nivel superior, fuera del loop {#filas}). */
  siglasTags: string[]
}

/**
 * Clona la celda `{_siglas_}` (fila de siglas) y la celda `{_codigo_}` (fila de
 * datos) N veces cada una, reemplazando el marcador por `{siglas_i}`/`{codigo_i}`
 * y agregando `{/filas}` al final del contenido del último clon de código (la
 * plantilla no trae el cierre del loop).
 */
export function expandirColumnasResponsabilidad(xml: string, anchosDxa: number[]): ResultadoExpansionColumnas {
  const n = anchosDxa.length
  if (n === 0) {
    throw new Error('[matriz-plantilla] No hay personas para generar columnas de responsabilidad.')
  }

  const bloqueSiglas = extraerBloqueTc(xml, MARCADOR_SIGLAS)
  const bloqueCodigo = extraerBloqueTc(xml, MARCADOR_CODIGO)

  const siglasTags: string[] = []
  const clonesSiglas: string[] = []
  const clonesCodigo: string[] = []

  for (let i = 0; i < n; i++) {
    const tagSiglas = siglasTagName(i)
    const tagCodigo = codigoTagName(i)
    siglasTags.push(tagSiglas)

    clonesSiglas.push(conAncho(bloqueSiglas, anchosDxa[i]).replace(MARCADOR_SIGLAS, `{${tagSiglas}}`))

    const esUltimo = i === n - 1
    const textoCodigo = esUltimo ? `{${tagCodigo}}{/filas}` : `{${tagCodigo}}`
    clonesCodigo.push(conAncho(bloqueCodigo, anchosDxa[i]).replace(MARCADOR_CODIGO, textoCodigo))
  }

  const xmlConSiglas = xml.replace(bloqueSiglas, clonesSiglas.join(''))
  const xmlFinal = xmlConSiglas.replace(bloqueCodigo, clonesCodigo.join(''))

  // Aserción defensiva: si la extracción/clonado produjo algo mal balanceado,
  // mejor fallar acá (dispara el fallback al export genérico) que generar un
  // .docx corrupto que Word ofrezca "reparar" al abrir.
  const juntos = clonesSiglas.join('') + clonesCodigo.join('')
  const abiertas = (juntos.match(/<w:tc>/g) ?? []).length
  const cerradas = (juntos.match(/<\/w:tc>/g) ?? []).length
  if (abiertas !== cerradas || abiertas !== n * 2) {
    throw new Error('[matriz-plantilla] Las celdas clonadas de responsabilidad quedaron mal balanceadas — abortando para no generar un .docx corrupto.')
  }

  return { documentXml: xmlFinal, siglasTags }
}

const PREFIJO_RESPONSABILIDAD = '<w:tcW w:w="4571" w:type="dxa"/><w:gridSpan w:val="1"/>'

/**
 * Sube el gridSpan/tcW del header "RESPONSABILIDAD" de 1 a N y redistribuye las
 * columnas "de respaldo" del tblGrid entre las N columnas reales.
 *
 * `document.xml` tiene VARIAS tablas (revisiones, contactos, la matriz) — cada
 * una con su propio `<w:tblGrid>`. El tblGrid correcto es el que precede
 * INMEDIATAMENTE a la celda "RESPONSABILIDAD" (mismo criterio que la inspección
 * manual del .docx), nunca "el primero del documento".
 */
export function ajustarGridColumnas(xml: string, anchosDxa: number[]): string {
  const n = anchosDxa.length
  const anchoTotal = anchosDxa.reduce((a, b) => a + b, 0)

  const respIdx = xml.indexOf(PREFIJO_RESPONSABILIDAD)
  if (respIdx === -1) {
    throw new Error('[matriz-plantilla] No se encontró la celda de header "RESPONSABILIDAD" con el gridSpan esperado — estructura de la plantilla inesperada.')
  }
  const gridStart = xml.lastIndexOf('<w:tblGrid>', respIdx)
  if (gridStart === -1) {
    throw new Error('[matriz-plantilla] No se encontró <w:tblGrid> antes de la celda "RESPONSABILIDAD".')
  }
  const gridEnd = xml.indexOf('</w:tblGrid>', gridStart) + '</w:tblGrid>'.length
  const gridOriginal = xml.slice(gridStart, gridEnd)

  const columnas = [...gridOriginal.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => m[1])
  // Las primeras 4 columnas (ID/ACTIVIDAD/FRECUENCIA/MEDIO) son fijas — el resto
  // es el presupuesto "de respaldo" de responsabilidad que se redistribuye.
  const fijas = columnas.slice(0, 4)
  const nuevoGrid =
    `<w:tblGrid>` +
    fijas.map(w => `<w:gridCol w:w="${w}"/>`).join('') +
    anchosDxa.map(w => `<w:gridCol w:w="${w}"/>`).join('') +
    `</w:tblGrid>`

  return xml
    .replace(gridOriginal, nuevoGrid)
    .replace(PREFIJO_RESPONSABILIDAD, `<w:tcW w:w="${anchoTotal}" w:type="dxa"/><w:gridSpan w:val="${n}"/>`)
}

/** Presupuesto real (dxa) de las 9 columnas "de respaldo" de la plantilla original — se redistribuye entre N columnas reales, con el resto en la última para que la suma cuadre exacto. */
const PRESUPUESTO_RESPONSABILIDAD_DXA = 525 + 511 + 568 + 513 + 517 + 582 + 582 + 525 + 487

export function calcularAnchosColumnas(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(PRESUPUESTO_RESPONSABILIDAD_DXA / n)
  const anchos = Array.from({ length: n }, () => base)
  anchos[n - 1] += PRESUPUESTO_RESPONSABILIDAD_DXA - base * n
  return anchos
}

/**
 * `{hoja}` ya vive dentro de un campo Word real (`PAGE`) en la plantilla — solo
 * hace falta reemplazar el texto de resultado cacheado por un valor semilla ("1"),
 * Word lo recalcula solo al abrir/imprimir/F9. `{totalHojas}` NO tiene campo
 * (`NUMPAGES`) — hay que construírselo, reusando el `<w:rPr>` del run original
 * para no perder la fuente/tamaño.
 */
export function insertarCamposPaginacion(xml: string): string {
  if (!xml.includes('{hoja}')) {
    throw new Error('[matriz-plantilla] No se encontró {hoja} en header1.xml.')
  }
  let resultado = xml.replace('{hoja}', '1')

  const runMatch = resultado.match(/<w:r[^>]*>(?:(?!<w:r[^>]*>)[\s\S])*?\{totalHojas\}(?:(?!<w:r[^>]*>)[\s\S])*?<\/w:r>/)
  if (!runMatch) {
    throw new Error('[matriz-plantilla] No se encontró el run de {totalHojas} en header1.xml.')
  }
  const runOriginal = runMatch[0]
  const rPrMatch = runOriginal.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
  const rPr = rPrMatch ? rPrMatch[0] : ''

  const campoNumPages =
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r>${rPr}<w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r>${rPr}<w:t>1</w:t></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`

  return resultado.replace(runOriginal, campoNumPages)
}

export interface ResultadoPreparacionPlantilla {
  documentXml: string
  header1Xml: string
  siglasTags: string[]
}

export function prepararXmlPlantilla(input: {
  documentXml: string
  header1Xml: string
  numPersonas: number
}): ResultadoPreparacionPlantilla {
  const anchos = calcularAnchosColumnas(input.numPersonas)
  const { documentXml: documentXmlExpandido, siglasTags } = expandirColumnasResponsabilidad(input.documentXml, anchos)
  const documentXml = ajustarGridColumnas(documentXmlExpandido, anchos)
  const header1Xml = insertarCamposPaginacion(input.header1Xml)
  return { documentXml, header1Xml, siglasTags }
}
