const MARCADOR_EXTENT = 'cx="9300000" cy="5300000"'

// Tamaño fijo original del placeholder de la plantilla — el ÁREA ÚTIL máxima
// disponible en la página apaisada, no el tamaño final de la imagen.
const MAX_CX_EMU = 9300000
const MAX_CY_EMU = 5300000
const MAX_RATIO = MAX_CX_EMU / MAX_CY_EMU // ≈1.7547

/**
 * Calcula el wp:extent/a:ext (EMU) que hace que la imagen del árbol ocupe el
 * máximo tamaño posible dentro del área útil de la página apaisada,
 * preservando su aspect ratio real — sin distorsión y sin padding interno
 * (eso ya lo dejó de hacer normalizarImagenOrganigrama). Si la imagen es más
 * ancha que el área (árbol achatado), se fija al ancho máximo y se reduce el
 * alto; si es más alta (árbol angosto y profundo), se fija al alto máximo y
 * se reduce el ancho.
 */
export function calcularExtentEmu(anchoPx: number, altoPx: number): { cx: number; cy: number } {
  const ratio = anchoPx / altoPx
  if (ratio >= MAX_RATIO) {
    return { cx: MAX_CX_EMU, cy: Math.round(MAX_CX_EMU / ratio) }
  }
  return { cx: Math.round(MAX_CY_EMU * ratio), cy: MAX_CY_EMU }
}

/**
 * Reemplaza el wp:extent y el a:ext (idénticos, "9300000"/"5300000" fijos en
 * la plantilla original) por el tamaño calculado — ambos ocurren EXACTAMENTE
 * 2 veces en document.xml (confirmado por inspección directa del .docx);
 * cualquier otro conteo aborta para no generar un documento corrupto.
 */
export function ajustarExtentEnDocumentXml(documentXml: string, cx: number, cy: number): string {
  const ocurrencias = documentXml.split(MARCADOR_EXTENT).length - 1
  if (ocurrencias !== 2) {
    throw new Error(`[organigrama-plantilla] Se esperaban 2 ocurrencias de "${MARCADOR_EXTENT}" en document.xml (wp:extent + a:ext), se encontraron ${ocurrencias}.`)
  }
  return documentXml.split(MARCADOR_EXTENT).join(`cx="${cx}" cy="${cy}"`)
}
