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
 * Convierte el .xlsx de una versión revisada (IPERC o MPP) a una tabla HTML
 * sanitizada, lista para `dangerouslySetInnerHTML` — misma idea que
 * mammoth para el Plan de Trabajo, pero acá el artefacto es XLSX: se usa
 * SheetJS (sheet_to_html) en vez de convertir a Word. Prioriza la hoja
 * `hojaPreferida` (la que arma la plantilla — 'IPERC' o 'MATRIZ EPPs'); si no
 * existe, usa la primera hoja del libro.
 *
 * Defensivo a propósito: cualquier archivo corrupto o sin hojas legibles
 * devuelve null — el caller decide cómo avisar (nunca throw).
 */
export function convertirXlsxAHtml(buffer: Buffer, hojaPreferida = 'IPERC'): string | null {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const hojaNombre = workbook.SheetNames.includes(hojaPreferida) ? hojaPreferida : workbook.SheetNames[0]
    const hoja = hojaNombre ? workbook.Sheets[hojaNombre] : undefined
    if (!hoja) return null

    const tablaHtml = XLSX.utils.sheet_to_html(hoja, { header: '', footer: '' })
    return sanitizeHtml(tablaHtml, OPCIONES_SANITIZE)
  } catch (error) {
    console.error('[convertirXlsxAHtml] Error convirtiendo el xlsx (no bloqueante):', error)
    return null
  }
}
