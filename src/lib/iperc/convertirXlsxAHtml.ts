import * as XLSX from 'xlsx'
import sanitizeHtml from 'sanitize-html'

/** El fragmento que produce sheet_to_html es siempre table/tr/td (sin thead) — se permite th/thead igual por si SheetJS cambia el formato. */
const OPCIONES_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: {
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
}

/**
 * Convierte el .xlsx de la versión revisada del IPERC a una tabla HTML
 * sanitizada, lista para `dangerouslySetInnerHTML` — misma idea que
 * mammoth para el Plan de Trabajo, pero acá el artefacto es XLSX: se usa
 * SheetJS (sheet_to_html) en vez de convertir a Word. Prioriza la hoja
 * llamada 'IPERC' (la que arma la plantilla); si no existe, usa la primera.
 *
 * Defensivo a propósito: cualquier archivo corrupto o sin hojas legibles
 * devuelve null — el caller decide cómo avisar (nunca throw).
 */
export function convertirXlsxAHtml(buffer: Buffer): string | null {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const hojaNombre = workbook.SheetNames.includes('IPERC') ? 'IPERC' : workbook.SheetNames[0]
    const hoja = hojaNombre ? workbook.Sheets[hojaNombre] : undefined
    if (!hoja) return null

    const tablaHtml = XLSX.utils.sheet_to_html(hoja, { header: '', footer: '' })
    return sanitizeHtml(tablaHtml, OPCIONES_SANITIZE)
  } catch (error) {
    console.error('[convertirXlsxAHtml] Error convirtiendo el xlsx (no bloqueante):', error)
    return null
  }
}
