import mammoth from 'mammoth'
import sanitizeHtml from 'sanitize-html'

/** Mismo criterio de sanitización que cualquier HTML de fuente externa que se
 * renderiza con dangerouslySetInnerHTML — mammoth ya produce HTML acotado
 * (sin scripts), pero igual se sanitiza antes de servirlo al cliente. */
const OPCIONES_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'sub', 'sup',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['data', 'http', 'https'] },
}

/**
 * Convierte el .docx de la versión revisada del PETS a HTML sanitizado,
 * listo para `dangerouslySetInnerHTML` — mismo enfoque que la vista del Plan
 * de Trabajo (mammoth), a diferencia del IPERC (XLSX, usa SheetJS).
 *
 * Defensivo a propósito: cualquier archivo corrupto devuelve null — el
 * caller decide cómo avisar, nunca throw.
 */
export async function convertirDocxAHtml(buffer: Buffer): Promise<string | null> {
  try {
    const resultado = await mammoth.convertToHtml({ buffer })
    return sanitizeHtml(resultado.value, OPCIONES_SANITIZE)
  } catch (error) {
    console.error('[convertirDocxAHtml] Error convirtiendo el docx (no bloqueante):', error)
    return null
  }
}
