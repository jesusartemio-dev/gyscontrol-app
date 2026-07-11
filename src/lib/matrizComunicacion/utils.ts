// Solo los niveles de gestión y ejecución del organigrama participan en la matriz
// (nivel 1 = Gerencia General, no gestiona el día a día del proyecto;
//  el último nivel son técnicos de campo, no son emisores/receptores de comunicaciones formales)
export const NIVELES_PARTICIPANTES_MATRIZ = [2, 3, 4] as const

/**
 * Calcula el nivel (profundidad) de cada nodo del organigrama, donde el/los nodo(s)
 * raíz (sin parentId) son nivel 1. Requiere TODOS los nodos del proyecto, no solo
 * los que tienen usuario asignado, para poder recorrer la cadena de padres completa.
 */
export function calcularNivelesOrgNodos(
  nodos: { id: string; parentId: string | null }[]
): Map<string, number> {
  const porId = new Map(nodos.map(n => [n.id, n]))
  const niveles = new Map<string, number>()

  function nivelDe(id: string): number {
    const cacheado = niveles.get(id)
    if (cacheado !== undefined) return cacheado
    const nodo = porId.get(id)
    const nivel = !nodo?.parentId ? 1 : nivelDe(nodo.parentId) + 1
    niveles.set(id, nivel)
    return nivel
  }

  for (const n of nodos) nivelDe(n.id)
  return niveles
}

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g')

/** lowercase + sin tildes — tolera mayúsculas/acentos, nunca sinónimos. */
export function normalizarTexto(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
}

export function generarSiglas(nombre: string, usadas: Set<string>): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const base = partes.map(p => p[0].toUpperCase()).join('')
  if (!usadas.has(base)) return base
  if (partes.length >= 2) {
    const alt = partes[0][0].toUpperCase() + partes[1].substring(0, 2).toUpperCase()
    if (!usadas.has(alt)) return alt
  }
  let i = 2
  while (usadas.has(`${base}${i}`)) i++
  return `${base}${i}`
}
