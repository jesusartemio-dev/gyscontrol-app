import { prisma } from '@/lib/prisma'
import { matchRolPorCargo } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { PUESTOS_MPP } from '@/lib/mpp/catalogos/puestos'

const MIN_PUESTOS_VALIDOS = 2

interface OrgNodoPuesto {
  id: string
  parentId: string | null
  cargoLabel: string
  orden: number
}

/**
 * SSOMA + el nodo RESIDENTE con todo su subárbol (BFS), deduplicado por
 * cargoLabel. Sin RESIDENTE reconocible, o con un resultado muy chico
 * (organigrama incompleto), cae al catálogo fijo PUESTOS_MPP — la MPP nunca
 * queda sin columnas.
 */
export function derivarPuestosMpp(nodos: OrgNodoPuesto[]): string[] {
  const porOrden = (a: OrgNodoPuesto, b: OrgNodoPuesto) => a.orden - b.orden

  const ssoma = nodos.filter(n => matchRolPorCargo(n.cargoLabel) === 'ssoma').sort(porOrden)[0]
  const residente = nodos.filter(n => matchRolPorCargo(n.cargoLabel) === 'residente').sort(porOrden)[0]

  if (!residente) return [...PUESTOS_MPP]

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

  const cola: OrgNodoPuesto[] = [residente]
  while (cola.length > 0) {
    const actual = cola.shift()!
    agregar(actual.cargoLabel)
    cola.push(...(hijosPorPadre.get(actual.id) ?? []))
  }

  return puestos.length < MIN_PUESTOS_VALIDOS ? [...PUESTOS_MPP] : puestos
}

export async function obtenerPuestosDelOrganigrama(proyectoId: string): Promise<string[]> {
  const nodos = await prisma.proyectoOrgNodo.findMany({
    where: { proyectoId },
    select: { id: true, parentId: true, cargoLabel: true, orden: true },
  })
  return derivarPuestosMpp(nodos)
}
