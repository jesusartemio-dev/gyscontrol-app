import { prisma } from '@/lib/prisma'
import { PUESTOS_MPP } from '@/lib/mpp/catalogos/puestos'

const MIN_PUESTOS_VALIDOS = 2

interface NodoConPuesto {
  puesto?: { id: string; nombre: string; orden: number; vaACampo: boolean } | null
}

export interface ColumnaMpp {
  /// null solo en el catálogo fijo de respaldo, que no está catalogado.
  puestoId: string | null
  nombre: string
}

/**
 * Las columnas de la matriz de EPP son los puestos que van a obra.
 *
 * Eso no se infiere del árbol: el catálogo de puestos ya lo dice en
 * `vaACampo` —"solo los de campo entran a la relación de personal que se
 * habilita en planta"— y quien se habilita en planta es quien necesita EPP.
 * Son 12 de los 18 puestos.
 *
 * Antes esto se deducía recorriendo el organigrama desde el residente y el
 * supervisor, y se equivocaba en los dos sentidos: metía al Cadista y al
 * Coordinador de Ingeniería, que no van a campo —por eso no tienen EPP en la
 * MPP real— y en CJM45, CJM48 y QRM15 se perdía un segundo nodo de seguridad
 * porque solo tomaba el primero.
 *
 * Se deduplica por puesto, no por el texto del cargo: un proyecto con dos
 * nodos de seguridad llamados "HSEQ" y "Supervisor de Seguridad (HSEQ)" es
 * una sola columna. El nombre que sale es el del catálogo, igual en todos los
 * proyectos, que es lo que permite guardar los EPP por defecto por puesto.
 *
 * Si el organigrama no aporta ningún puesto de campo, cae al catálogo fijo
 * PUESTOS_MPP — la MPP nunca queda sin columnas.
 */
export function derivarColumnasMpp(nodos: NodoConPuesto[]): ColumnaMpp[] {
  const unicos = new Map<string, { nombre: string; orden: number }>()
  for (const nodo of nodos) {
    if (!nodo.puesto?.vaACampo) continue
    unicos.set(nodo.puesto.id, { nombre: nodo.puesto.nombre, orden: nodo.puesto.orden })
  }

  if (unicos.size < MIN_PUESTOS_VALIDOS) {
    return PUESTOS_MPP.map(nombre => ({ puestoId: null, nombre }))
  }

  return [...unicos.entries()]
    .sort((a, b) => a[1].orden - b[1].orden || a[1].nombre.localeCompare(b[1].nombre))
    .map(([puestoId, { nombre }]) => ({ puestoId, nombre }))
}

/** Solo los nombres, que es lo que se congela en `Mpp.puestos`. */
export function derivarPuestosMpp(nodos: NodoConPuesto[]): string[] {
  return derivarColumnasMpp(nodos).map(c => c.nombre)
}

const SELECT_NODOS = {
  puesto: { select: { id: true, nombre: true, orden: true, vaACampo: true } },
} as const

export async function obtenerColumnasMpp(proyectoId: string): Promise<ColumnaMpp[]> {
  const nodos = await prisma.proyectoOrgNodo.findMany({
    where: { proyectoId },
    select: SELECT_NODOS,
  })
  return derivarColumnasMpp(nodos)
}

export async function obtenerPuestosDelOrganigrama(proyectoId: string): Promise<string[]> {
  const columnas = await obtenerColumnasMpp(proyectoId)
  return columnas.map(c => c.nombre)
}
