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

export interface PersonaResoluble {
  siglas: string
  userId: string | null
  esCliente: boolean
}

/**
 * Misma construcción de "personal" que usa la generación con IA de la
 * Matriz (POST /api/proyectos/[id]/matriz-comunicacion) — mismo orden
 * (equipo GYS primero, contactos del cliente después) y mismo Set de
 * siglas usadas, para que las siglas calculadas acá coincidan con las que
 * ya están guardadas en `MatrizComunicacionFila.receptores`. A diferencia
 * de esa ruta, esta versión conserva `userId` (null para clientes) en vez
 * de descartarlo — lo necesita cualquier consumidor que deba resolver una
 * sigla a un usuario real (ej. autoasignación de Responsable), y nunca
 * debe asignar un cliente como responsable interno.
 */
export function construirPersonalResoluble(
  orgNodos: { id: string; parentId: string | null; userId: string | null; user: { name: string | null } | null }[],
  contactosCliente: { crmContacto: { nombre: string } }[]
): PersonaResoluble[] {
  const niveles = calcularNivelesOrgNodos(orgNodos)

  const seenUserIds = new Set<string>()
  const nodosParticipantes = orgNodos.filter(n => {
    if (!n.user?.name || !n.userId) return false
    if (!NIVELES_PARTICIPANTES_MATRIZ.includes(niveles.get(n.id) as 2 | 3 | 4)) return false
    if (seenUserIds.has(n.userId)) return false
    seenUserIds.add(n.userId)
    return true
  })

  const usadas = new Set<string>()
  const personal: PersonaResoluble[] = nodosParticipantes.map(n => {
    const siglas = generarSiglas(n.user!.name!, usadas)
    usadas.add(siglas)
    return { siglas, userId: n.userId, esCliente: false }
  })

  for (const cc of contactosCliente) {
    const siglas = generarSiglas(cc.crmContacto.nombre, usadas)
    usadas.add(siglas)
    personal.push({ siglas, userId: null, esCliente: true })
  }

  return personal
}
