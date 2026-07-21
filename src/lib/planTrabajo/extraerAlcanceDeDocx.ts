import PizZip from 'pizzip'

const INICIO_SECCION = /^(?:\d+\.?\s*)?ALCANCE\s+DEL\s+SERVICIO$/i
const FIN_SECCION = /^(?:\d+\.?\s*)?(ORGANIGRAMA|HISTOGRAMAS|CRONOGRAMA|ANEXOS)$/i

function extraerTextoPlano(parrafoXml: string): string {
  return Array.from(parrafoXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g))
    .map(m => m[1])
    .join('')
}

/**
 * Extrae el texto de la sección "ALCANCE DEL SERVICIO" del .docx de la versión
 * revisada del Plan de Trabajo (V2) — para usar como contexto rico al generar
 * el IPERC (ver generarConIa.ts). Se corta ahí y no antes/después porque es la
 * única sección con el detalle real de método/tareas; el resto (organigrama,
 * histogramas, cronograma, anexos) no aporta información de riesgos.
 *
 * Match exacto (con o sin número de sección delante) para no confundir el
 * encabezado real con la entrada del índice al inicio del documento, que trae
 * el número de página pegado (ej. "11.ALCANCE DEL SERVICIO10") — mismo
 * problema y misma solución que en extraerImagenesDeDocx.ts.
 *
 * Defensivo a propósito: si no encuentra el encabezado de inicio, devuelve
 * '' — el caller cae al alcance estructurado (alcanceDetallado) como
 * respaldo. Nunca throw.
 */
export function extraerAlcanceDeDocx(buffer: Buffer): string {
  try {
    const zip = new PizZip(buffer)
    const docFile = zip.file('word/document.xml')
    if (!docFile) return ''

    const parrafos = docFile.asText().split('</w:p>')

    const indiceInicio = parrafos.findIndex(p => INICIO_SECCION.test(extraerTextoPlano(p).trim()))
    if (indiceInicio === -1) return ''

    let indiceFin = parrafos.length
    for (let i = indiceInicio + 1; i < parrafos.length; i++) {
      if (FIN_SECCION.test(extraerTextoPlano(parrafos[i]).trim())) {
        indiceFin = i
        break
      }
    }

    const lineas: string[] = []
    for (let i = indiceInicio + 1; i < indiceFin; i++) {
      const parrafo = parrafos[i]
      const texto = extraerTextoPlano(parrafo).trim()
      if (!texto) continue
      const esViñeta = /<w:numId\s/.test(parrafo)
      lineas.push(esViñeta ? `- ${texto}` : texto)
    }

    return lineas.join('\n').trim()
  } catch (error) {
    console.error('[extraerAlcanceDeDocx] Error parseando el docx (no bloqueante):', error)
    return ''
  }
}
