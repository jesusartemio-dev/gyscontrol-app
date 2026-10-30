/**
 * Quién ocupa cada nodo del organigrama.
 *
 * Antes se adivinaba por palabras clave sobre el `cargoLabel` ("¿contiene
 * 'supervisor'?"), lo que confundía "Supervisor de Proyecto" con el supervisor de
 * campo y fallaba con cualquier sinónimo nuevo. Con el catálogo de puestos el
 * nodo y la persona apuntan al mismo `puestoId`, así que es una comparación
 * exacta y no una heurística.
 *
 * El emparejado por palabras clave sigue existiendo como respaldo para las
 * plantillas que todavía no tienen `puestoId`.
 */

/**
 * Campo del proyecto que ocupa cada rol fijo. Se indexa por `rolFijoProyecto`,
 * que es exclusivo, y NO por `rolFuncional`: ese lo comparten varios puestos
 * (Supervisor de Proyecto, Coordinador de Ingeniería y Programador son todos
 * 'residente'), así que usarlo aquí ponía a la misma persona en los tres nodos.
 */
const CAMPO_POR_ROL_FIJO: Record<string, 'gestorId' | 'supervisorId' | 'liderId' | 'comercialId'> = {
  gestor: 'gestorId',
  supervisor: 'supervisorId',
  lider: 'liderId',
  comercial: 'comercialId',
}

export interface RolesFijosProyecto {
  gestorId: string | null
  supervisorId: string | null
  liderId: string | null
  comercialId: string | null
}

/**
 * Reparte a las personas de un puesto entre los nodos que lo piden, en orden de
 * incorporación: si la plantilla trae tres nodos "Técnico Operativo" y hay tres
 * técnicos asignados, cada nodo recibe uno distinto.
 */
export class RepartidorPorPuesto {
  private readonly porPuesto = new Map<string, string[]>()
  private readonly siguiente = new Map<string, number>()

  constructor(miembros: Array<{ userId: string; puestoId: string | null }>) {
    for (const m of miembros) {
      if (!m.puestoId) continue
      const lista = this.porPuesto.get(m.puestoId) ?? []
      lista.push(m.userId)
      this.porPuesto.set(m.puestoId, lista)
    }
  }

  tomar(puestoId: string): string | null {
    const lista = this.porPuesto.get(puestoId)
    if (!lista) return null
    const i = this.siguiente.get(puestoId) ?? 0
    if (i >= lista.length) return null
    this.siguiente.set(puestoId, i + 1)
    return lista[i]
  }
}

/**
 * Devuelve el userId para un nodo cuyo puesto se conoce, o null si el puesto no
 * corresponde a un rol fijo y nadie con ese puesto está asignado al proyecto.
 */
export function resolverOcupantePorPuesto(
  puesto: { id: string; rolFijoProyecto: string | null },
  rolesFijos: RolesFijosProyecto,
  repartidor: RepartidorPorPuesto
): string | null {
  const campo = puesto.rolFijoProyecto ? CAMPO_POR_ROL_FIJO[puesto.rolFijoProyecto] : undefined
  if (campo && rolesFijos[campo]) return rolesFijos[campo]
  return repartidor.tomar(puesto.id)
}
