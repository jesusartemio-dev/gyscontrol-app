import { JSDOM } from 'jsdom'

// jsdom no exporta DOMParser standalone — se obtiene de la window de una
// instancia JSDOM vacía, reutilizable entre parses.
const { window } = new JSDOM('')
const parser = new window.DOMParser()

/**
 * Valida que un string XML esté bien formado (tags balanceados/cerrados
 * correctamente) usando un parser estricto real, no una heurística de
 * substring — exactamente el gap que dejó pasar el bug de NUMPAGES (runs
 * <w:r> anidados dentro de <w:rPr> sin cerrar, que ningún assert de "contiene
 * el texto X" hubiera detectado).
 */
export function asertarXmlBienFormado(xml: string, contexto: string): void {
  const doc = parser.parseFromString(xml, 'application/xml')
  const errores = doc.getElementsByTagName('parsererror')
  if (errores.length > 0) {
    throw new Error(`[${contexto}] XML mal formado: ${errores[0].textContent}`)
  }
}
