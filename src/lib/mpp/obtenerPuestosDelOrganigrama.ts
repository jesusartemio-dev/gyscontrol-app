import { prisma } from '@/lib/prisma'
import { matchRolPorCargo } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { PUESTOS_MPP } from '@/lib/mpp/catalogos/puestos'

const MIN_PUESTOS_VALIDOS = 2

interface OrgNodoPuesto {
  id: string
  parentId: string | null
  cargoLabel: string
  orden: number
  /// El rol que el catálogo de puestos le asigna al nodo. Manda sobre el texto.
  puesto?: { rolFuncional: string | null } | null
}

/**
 * El rol de un nodo sale del `rolFuncional` de su puesto; el regex sobre
 * `cargoLabel` queda solo como respaldo para nodos sin puesto catalogado.
 *
 * Es la misma precedencia que usa el cronograma para resolver responsables, y
 * la razón es concreta: en CJM52 el nodo "Supervisor de Proyecto" tiene
 * rolFuncional 'residente' en el catálogo, pero adivinando por palabras sale
 * 'supervisor'. Sin residente reconocible, la MPP caía al catálogo fijo y las
 * columnas quedaban con diez puestos que no son los del proyecto.
 */
function rolDeNodo(nodo: OrgNodoPuesto): string | null {
  if (nodo.puesto) return nodo.puesto.rolFuncional
  return matchRolPorCargo(nodo.cargoLabel)
}

/** Los roles cuya gente va a obra, y por lo tanto necesita EPP. */
const ROLES_RAIZ = new Set(['residente', 'supervisor'])

/**
 * Cuántos padres tiene cada nodo encima. Un organigrama con un ciclo (padre
 * que termina apuntándose a sí mismo) no cuelga el cálculo: se corta al
 * repetir un nodo.
 */
function calcularProfundidad(nodos: OrgNodoPuesto[]): Map<string, number> {
  const porId = new Map(nodos.map(n => [n.id, n]))
  const profundidad = new Map<string, number>()

  for (const nodo of nodos) {
    let nivel = 0
    let actual = nodo
    const vistos = new Set<string>([nodo.id])
    while (actual.parentId) {
      const padre = porId.get(actual.parentId)
      if (!padre || vistos.has(padre.id)) break
      vistos.add(padre.id)
      actual = padre
      nivel++
    }
    profundidad.set(nodo.id, nivel)
  }
  return profundidad
}

/**
 * Las columnas de la matriz son los puestos que van a obra: el SSOMA, más
 * cada nodo con rol de residente o de supervisor con todo su subárbol (BFS),
 * deduplicado por cargoLabel. Gerencia, Comercial, Logística y los gestores
 * quedan fuera: no necesitan EPP.
 *
 * El supervisor cuenta como raíz por sí mismo, no solo cuando cuelga del
 * residente. Mirando los 13 proyectos con organigrama: en CJM44, CJM45, CJM48
 * y QRM15 el residente es el Coordinador de Ingeniería y su subárbol es solo
 * el Cadista, mientras los técnicos de campo cuelgan del Supervisor de
 * Construcción, que es una rama hermana. Con el residente solo, la matriz
 * dejaba fuera justo a los que más EPP necesitan. Y CJM39, que no tiene
 * ningún nodo marcado como residente, se quedaba sin columnas propias.
 *
 * Sin ninguna raíz reconocible, o con un resultado muy chico (organigrama
 * incompleto), cae al catálogo fijo PUESTOS_MPP — la MPP nunca queda sin
 * columnas.
 */
export function derivarPuestosMpp(nodos: OrgNodoPuesto[]): string[] {
  const porOrden = (a: OrgNodoPuesto, b: OrgNodoPuesto) => a.orden - b.orden

  const ssoma = nodos.filter(n => rolDeNodo(n) === 'ssoma').sort(porOrden)[0]

  // Las raíces se recorren de arriba hacia abajo: si un supervisor cuelga del
  // residente, la rama del residente va primero y se lo lleva dentro. Por
  // `orden` solo, el subordinado podía salir antes que su jefe.
  const profundidad = calcularProfundidad(nodos)
  const raices = nodos
    .filter(n => ROLES_RAIZ.has(rolDeNodo(n) ?? ''))
    .sort((a, b) => (profundidad.get(a.id)! - profundidad.get(b.id)!) || porOrden(a, b))

  if (raices.length === 0) return [...PUESTOS_MPP]

  const hijosPorPadre = new Map<string, OrgNodoPuesto[]>()
  for (const nodo of nodos) {
    if (!nodo.parentId) continue
    if (!hijosPorPadre.has(nodo.parentId)) hijosPorPadre.set(nodo.parentId, [])
    hijosPorPadre.get(nodo.parentId)!.push(nodo)
  }
  for (const hijos of hijosPorPadre.values()) hijos.sort(porOrden)

  const vistos = new Set<string>()
  const puestos: string[] = []
  const agregar = (cargoLabel: string) => {
    const key = cargoLabel.trim().toLowerCase()
    if (vistos.has(key)) return
    vistos.add(key)
    puestos.push(cargoLabel)
  }

  if (ssoma) agregar(ssoma.cargoLabel)

  // Una rama completa por raíz, no todas a la vez: así las columnas salen
  // agrupadas por equipo y no intercaladas. Un supervisor que ya venía en el
  // subárbol del residente se deduplica solo.
  for (const raiz of raices) {
    const cola: OrgNodoPuesto[] = [raiz]
    while (cola.length > 0) {
      const actual = cola.shift()!
      agregar(actual.cargoLabel)
      cola.push(...(hijosPorPadre.get(actual.id) ?? []))
    }
  }

  return puestos.length < MIN_PUESTOS_VALIDOS ? [...PUESTOS_MPP] : puestos
}

export async function obtenerPuestosDelOrganigrama(proyectoId: string): Promise<string[]> {
  const nodos = await prisma.proyectoOrgNodo.findMany({
    where: { proyectoId },
    select: {
      id: true,
      parentId: true,
      cargoLabel: true,
      orden: true,
      puesto: { select: { rolFuncional: true } },
    },
  })
  return derivarPuestosMpp(nodos)
}
