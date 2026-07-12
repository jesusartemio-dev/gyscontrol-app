const TWIP_A_EMU = 635 // 1 twip = 1/1440in = 914400/1440 EMU

/**
 * Márgenes reales de cada sección de la plantilla (word/document.xml,
 * confirmados por inspección directa del .docx — no recalcular sin volver a
 * inspeccionar si la plantilla cambia). VERTICAL son los de la sección 1
 * (carátula); APAISADA son los originales de la sección 2 (lámina). El top
 * de la vertical (2835 twips) es mayor que el de la apaisada (2400) — ambos
 * ya incluyen el espacio real que ocupa el header en cada orientación.
 */
const MARGENES_VERTICAL = { pgW: 11906, pgH: 16838, top: 2835, bottom: 1077, left: 1077, right: 1077 }
const MARGENES_APAISADA = { pgW: 16838, pgH: 11906, top: 2400, bottom: 1077, left: 1077, right: 1077 }

function areaUtilEmu(m: typeof MARGENES_VERTICAL): { maxCx: number; maxCy: number } {
  return {
    maxCx: (m.pgW - m.left - m.right) * TWIP_A_EMU,
    maxCy: (m.pgH - m.top - m.bottom) * TWIP_A_EMU,
  }
}

export type OrientacionLamina = 'vertical' | 'apaisada'

// Árboles ya compactados con aspecto cuadrado/alto no necesitan el ancho de
// una página apaisada (deja márgenes laterales enormes) — mejor una página
// vertical, igual que la carátula (documento uniforme). Árboles anchos siguen
// necesitando la apaisada.
const UMBRAL_ASPECTO_VERTICAL = 1.5

export function elegirOrientacion(anchoPx: number, altoPx: number): OrientacionLamina {
  return anchoPx / altoPx <= UMBRAL_ASPECTO_VERTICAL ? 'vertical' : 'apaisada'
}

/**
 * Calcula el wp:extent/a:ext (EMU) que hace que la imagen del árbol ocupe el
 * máximo tamaño posible dentro del área útil REAL (según orientación,
 * respetando los márgenes de la plantilla) — preservando su aspect ratio,
 * sin distorsión y sin padding interno (eso ya lo dejó de hacer
 * normalizarImagenOrganigrama). Si la imagen es más ancha que el área
 * (relativamente achatada), se fija al ancho máximo y se reduce el alto; si
 * es más alta (angosta y profunda), se fija al alto máximo y se reduce el
 * ancho.
 */
export function calcularExtentEmu(anchoPx: number, altoPx: number, orientacion: OrientacionLamina): { cx: number; cy: number } {
  const { maxCx, maxCy } = areaUtilEmu(orientacion === 'vertical' ? MARGENES_VERTICAL : MARGENES_APAISADA)
  const ratio = anchoPx / altoPx
  const maxRatio = maxCx / maxCy
  if (ratio >= maxRatio) {
    return { cx: maxCx, cy: Math.round(maxCx / ratio) }
  }
  return { cx: Math.round(maxCy * ratio), cy: maxCy }
}

/**
 * Reemplaza el wp:extent y el a:ext (idénticos en la plantilla original) por
 * el tamaño calculado — ambos ocurren EXACTAMENTE 2 veces en document.xml
 * (confirmado por inspección directa del .docx); cualquier otro conteo
 * aborta para no generar un documento corrupto.
 */
export function ajustarExtentEnDocumentXml(documentXml: string, cx: number, cy: number): string {
  const MARCADOR_EXTENT = 'cx="9300000" cy="5300000"'
  const ocurrencias = documentXml.split(MARCADOR_EXTENT).length - 1
  if (ocurrencias !== 2) {
    throw new Error(`[organigrama-plantilla] Se esperaban 2 ocurrencias de "${MARCADOR_EXTENT}" en document.xml (wp:extent + a:ext), se encontraron ${ocurrencias}.`)
  }
  return documentXml.split(MARCADOR_EXTENT).join(`cx="${cx}" cy="${cy}"`)
}

// sectPr ORIGINAL de la sección 2 (apaisada) y su equivalente en vertical —
// idéntico al sectPr real de la sección 1 (carátula), para que ambas páginas
// verticales queden con el mismo formato (documento uniforme).
const SECTPR2_APAISADA = '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape" w:code="9"/><w:pgMar w:top="2400" w:right="1077" w:bottom="1077" w:left="1077" w:header="397" w:footer="397" w:gutter="0"/>'
const SECTPR2_VERTICAL = '<w:pgSz w:w="11906" w:h="16838" w:code="9"/><w:pgMar w:top="2835" w:right="1077" w:bottom="1077" w:left="1077" w:header="397" w:footer="397" w:gutter="0"/>'

/**
 * Cambia la orientación de la SECCIÓN 2 (la lámina) — 'apaisada' no toca nada
 * (es como ya viene la plantilla); 'vertical' reemplaza su pgSz+pgMar por los
 * mismos de la sección 1. El marcador apaisado ocurre EXACTAMENTE 1 vez en
 * document.xml; cualquier otro conteo aborta para no generar un documento
 * corrupto o cambiar la orientación de la sección equivocada.
 */
export function ajustarOrientacionEnDocumentXml(documentXml: string, orientacion: OrientacionLamina): string {
  if (orientacion === 'apaisada') return documentXml

  const ocurrencias = documentXml.split(SECTPR2_APAISADA).length - 1
  if (ocurrencias !== 1) {
    throw new Error(`[organigrama-plantilla] Se esperaba exactamente 1 ocurrencia del sectPr apaisado de la sección 2, se encontraron ${ocurrencias}.`)
  }
  return documentXml.replace(SECTPR2_APAISADA, SECTPR2_VERTICAL)
}
