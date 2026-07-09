/**
 * Parseo determinista de los campos estructurados de CatalogoServicio
 * (actividadTag/filtroAlcance/notaCantidad) a partir de `descripcion`.
 * Puro y testeable — usado por scripts/backfill-catalogo-servicio-estructura.ts.
 * NUNCA modifica `descripcion`; nunca toca `reglasDificultad` (carga manual).
 */

export type FiltroAlcanceParseado = 'general' | 'brownfield' | 'detalle'

export interface ResultadoParseoEstructura {
  actividadTag: string[]
  filtroAlcance: FiltroAlcanceParseado
  notaCantidad: string | null
  /** No-null solo cuando la fila necesita revisión manual (alcance/cantidad ambiguos). Ausencia de tag NO cuenta como ambigüedad — es el estado por defecto esperado. */
  advertencia: string | null
}

const RX_TAGS_INICIALES = /^(\[[^\]]+\])+/
const RX_TAG_INDIVIDUAL = /\[([^\]]+)\]/g
const RX_ALCANCE_BROWNFIELD = /Alcance:\s*proyectos en instalaciones existentes/i
const RX_ALCANCE_DETALLE = /Alcance:\s*solo en contratos con ingenier[ií]a de detalle/i
const RX_ALCANCE_PREFIJO = /Alcance:/i
const RX_CANTIDAD = /Cantidad\s*=\s*N[°º]?\s*de\s+(.+?)[.\n]/i
const RX_CANTIDAD_PREFIJO = /Cantidad/i

export function parsearActividadTags(descripcion: string): string[] {
  const bloqueInicial = descripcion.match(RX_TAGS_INICIALES)?.[0] ?? ''
  if (!bloqueInicial) return []
  return Array.from(bloqueInicial.matchAll(RX_TAG_INDIVIDUAL), m => m[1].trim())
}

export function parsearFiltroAlcance(
  descripcion: string,
  tags: string[]
): { valor: FiltroAlcanceParseado; ambiguo: boolean } {
  const tieneTagBrownfield = tags.some(t => /^brownfield$/i.test(t))
  if (tieneTagBrownfield || RX_ALCANCE_BROWNFIELD.test(descripcion)) {
    return { valor: 'brownfield', ambiguo: false }
  }
  if (RX_ALCANCE_DETALLE.test(descripcion)) {
    return { valor: 'detalle', ambiguo: false }
  }
  // Contiene "Alcance:" pero no matchea ninguna de las dos frases conocidas → ambiguo, revisar a mano.
  if (RX_ALCANCE_PREFIJO.test(descripcion)) {
    return { valor: 'general', ambiguo: true }
  }
  return { valor: 'general', ambiguo: false }
}

export function parsearNotaCantidad(descripcion: string): { valor: string | null; ambiguo: boolean } {
  const match = descripcion.match(RX_CANTIDAD)
  if (match) {
    return { valor: match[1].trim(), ambiguo: false }
  }
  // Contiene la palabra "Cantidad" pero no matchea el patrón "Cantidad = N° de X" → ambiguo, revisar a mano.
  if (RX_CANTIDAD_PREFIJO.test(descripcion)) {
    return { valor: null, ambiguo: true }
  }
  return { valor: null, ambiguo: false }
}

export function parsearEstructuraCatalogoServicio(descripcion: string): ResultadoParseoEstructura {
  const actividadTag = parsearActividadTags(descripcion)
  const alcance = parsearFiltroAlcance(descripcion, actividadTag)
  const cantidad = parsearNotaCantidad(descripcion)

  const advertencias: string[] = []
  if (alcance.ambiguo) advertencias.push('Contiene "Alcance:" pero no matchea brownfield/detalle conocidos')
  if (cantidad.ambiguo) advertencias.push('Contiene "Cantidad" pero no matchea el patrón "Cantidad = N° de X"')

  return {
    actividadTag,
    filtroAlcance: alcance.valor,
    notaCantidad: cantidad.valor,
    advertencia: advertencias.length > 0 ? advertencias.join('; ') : null,
  }
}
