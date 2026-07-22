import * as XLSX from 'xlsx'

/** Tope defensivo de caracteres — evita inflar el prompt si alguien sube una matriz gigante. */
const MAX_CHARS = 20000

/**
 * Convierte el .xlsx de una versión revisada (V2) a texto plano (CSV) — para
 * usar como contexto en generadores de IA (IPERC→PETS/MPP, MPP→PETS, ver
 * obtenerIpercParaContexto.ts / obtenerMppParaContexto.ts). CSV en vez de HTML
 * (a diferencia de convertirXlsxAHtml.ts, que arma la vista visual): acá el
 * destino es un prompt de texto, no dangerouslySetInnerHTML.
 *
 * Prioriza la hoja `hojaPreferida` (la que arma la plantilla — 'IPERC' o
 * 'MATRIZ EPPs'); si no existe, usa la primera hoja del libro.
 *
 * Defensivo a propósito: cualquier archivo corrupto o sin hojas legibles
 * devuelve null, nunca throw.
 */
export function convertirXlsxATexto(buffer: Buffer, hojaPreferida = 'IPERC'): string | null {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const hojaNombre = workbook.SheetNames.includes(hojaPreferida) ? hojaPreferida : workbook.SheetNames[0]
    const hoja = hojaNombre ? workbook.Sheets[hojaNombre] : undefined
    if (!hoja) return null

    const csv = XLSX.utils.sheet_to_csv(hoja).trim()
    if (!csv) return null
    return csv.length > MAX_CHARS ? `${csv.slice(0, MAX_CHARS)}\n[... truncado, matriz muy extensa ...]` : csv
  } catch (error) {
    console.error('[convertirXlsxATexto] Error convirtiendo el xlsx (no bloqueante):', error)
    return null
  }
}
