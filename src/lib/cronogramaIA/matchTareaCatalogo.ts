/**
 * Anti-duplicado de tareas propuestas por IA (Etapa B de CON/PRO, ver
 * validarTareasNuevasPropuestas en validarPropuestasIA.ts) contra TODO el
 * catálogo real — una tarea "nueva" que en realidad ya existe (con otro
 * nombre/redacción) nunca debe crear un duplicado; se convierte en
 * advertencia sugiriendo la tarea de catálogo existente. Deliberadamente
 * sesgado a falsos positivos antes que a falsos negativos: es preferible
 * descartar una propuesta legítima ocasional que fragmentar el catálogo
 * con casi-duplicados.
 */

export interface CatalogoParaMatch {
  id: string
  nombre: string
}

export interface ResultadoMatchDuplicado {
  esDuplicado: boolean
  candidato?: CatalogoParaMatch
}

const STOPWORDS_MATCH = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al', 'por', 'con', 'para', 'un', 'una'])
const LARGO_MINIMO_PALABRA_SIGNIFICATIVA = 4
/** Una palabra compartida cuenta como señal fuerte solo si es lo bastante específica (no un genérico corto como "cable"). */
const LARGO_MINIMO_PALABRA_DISTINTIVA = 5
const UMBRAL_SOLAPE = 0.5

/** Minúsculas, sin tildes/puntuación, espacios colapsados — misma normalización usada para agrupar CronogramaIASugerenciaAceptada.nombreNormalizado. */
export function normalizarNombreTarea(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function palabrasSignificativas(nombreNormalizado: string): Set<string> {
  return new Set(nombreNormalizado.split(' ').filter(p => p.length >= LARGO_MINIMO_PALABRA_SIGNIFICATIVA && !STOPWORDS_MATCH.has(p)))
}

/**
 * Busca si `nombrePropuesto` ya existe en el catálogo (contención de
 * substring normalizado, o solape de palabras significativas con al menos
 * una palabra distintiva compartida) — devuelve el mejor candidato si lo
 * hay, para convertir la propuesta en "agregar la tarea del catálogo X"
 * en vez de crear una nueva.
 */
export function buscarDuplicadoEnCatalogo(nombrePropuesto: string, catalogo: CatalogoParaMatch[]): ResultadoMatchDuplicado {
  const normalizadoPropuesto = normalizarNombreTarea(nombrePropuesto)
  if (!normalizadoPropuesto) return { esDuplicado: false }

  const porContencion = catalogo.find(c => {
    const n = normalizarNombreTarea(c.nombre)
    return n.length > 0 && (n === normalizadoPropuesto || n.includes(normalizadoPropuesto) || normalizadoPropuesto.includes(n))
  })
  if (porContencion) return { esDuplicado: true, candidato: porContencion }

  const palabrasPropuesto = palabrasSignificativas(normalizadoPropuesto)
  if (palabrasPropuesto.size === 0) return { esDuplicado: false }

  let mejor: { candidato: CatalogoParaMatch; score: number } | null = null
  for (const c of catalogo) {
    const palabrasCatalogo = palabrasSignificativas(normalizarNombreTarea(c.nombre))
    if (palabrasCatalogo.size === 0) continue

    const interseccion = [...palabrasPropuesto].filter(p => palabrasCatalogo.has(p))
    const tieneDistintiva = interseccion.some(p => p.length >= LARGO_MINIMO_PALABRA_DISTINTIVA)
    if (interseccion.length === 0 || !tieneDistintiva) continue

    const score = interseccion.length / Math.min(palabrasPropuesto.size, palabrasCatalogo.size)
    if (!mejor || score > mejor.score) mejor = { candidato: c, score }
  }

  if (mejor && mejor.score >= UMBRAL_SOLAPE) {
    return { esDuplicado: true, candidato: mejor.candidato }
  }
  return { esDuplicado: false }
}
