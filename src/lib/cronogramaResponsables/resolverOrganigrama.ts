import type { RolResponsable } from './reglasResponsable'

/**
 * ProyectoOrgNodo.cargoLabel es texto libre (sin catálogo/enum en BD) — cada
 * proyecto puede escribirlo distinto. Este matcher reconcilia esa variedad
 * real observada en producción/dev (ej. "HSEQ", "Supervisor de Seguridad
 * (HSEQ)", "Residente / Ing. Programador", "Gestor de Proyecto" singular,
 * "GERENCIA DE PROYECTOS" en mayúsculas) contra los 6 roles fijos que usa la
 * tabla EDT->rol. Mismo espíritu que REGLAS_RACI_CARGO en
 * src/lib/planTrabajo/raciReglas.ts (evaluado ahí para una feature distinta,
 * Plan de Trabajo) — reutilizamos el mismo criterio de orden.
 *
 * ORDEN IMPORTA (el primer patrón que matchea gana): seguridad/ssoma/hseq
 * ANTES que supervisor/residente, para que "Supervisor de Seguridad (HSEQ)"
 * caiga en ssoma y no en supervisor.
 */
interface ReglaCargoRol {
  patron: RegExp
  rol: RolResponsable
}

const REGLAS_CARGO_ROL: ReglaCargoRol[] = [
  { patron: /seguridad|ssoma|sso\b|hseq|hse\b/i, rol: 'ssoma' },
  { patron: /residente/i, rol: 'residente' },
  { patron: /supervisor|construcci[oó]n/i, rol: 'supervisor' },
  { patron: /gestor|gesti[oó]n de proyectos?|project manager|jefe de proyecto/i, rol: 'gestor' },
  { patron: /cadista|dibujante|cad\b/i, rol: 'cadista' },
  { patron: /log[ií]stic|comercial/i, rol: 'logistica' },
]

/** Rol que matchea un cargoLabel libre, o null si no matchea ninguna regla conocida. */
export function matchRolPorCargo(cargoLabel: string): RolResponsable | null {
  for (const regla of REGLAS_CARGO_ROL) {
    if (regla.patron.test(cargoLabel)) return regla.rol
  }
  return null
}

export interface OrgNodoResoluble {
  id: string
  userId: string | null
  cargoLabel: string
  orden: number
  user?: { name: string | null } | null
}

export interface PersonaResuelta {
  userId: string
  nombre: string
  nodoId: string
}

export interface CargoLabelNoReconocido {
  nodoId: string
  cargoLabel: string
}

export interface ResolucionOrganigrama {
  porRol: Map<RolResponsable, PersonaResuelta | null>
  cargoLabelsNoReconocidos: CargoLabelNoReconocido[]
}

const TODOS_LOS_ROLES: RolResponsable[] = ['gestor', 'residente', 'supervisor', 'ssoma', 'cadista', 'logistica']

/**
 * Resuelve, para el organigrama de UN proyecto, qué persona ocupa cada uno
 * de los 6 roles fijos. Nodos sin userId (vacantes) no participan. Si 2+
 * nodos matchean el mismo rol, gana el de menor `orden` (determinista). Un
 * cargoLabel que no matchea ninguna regla se acumula en
 * cargoLabelsNoReconocidos para auditoría (ver auditoriaOrganigrama.ts) — en
 * ningún caso se inventa ni se asigna al azar.
 */
export function resolverOrganigramaProyecto(nodos: OrgNodoResoluble[]): ResolucionOrganigrama {
  const porRol = new Map<RolResponsable, PersonaResuelta | null>(TODOS_LOS_ROLES.map(r => [r, null]))
  const cargoLabelsNoReconocidos: CargoLabelNoReconocido[] = []

  const candidatosPorRol = new Map<RolResponsable, OrgNodoResoluble[]>()

  for (const nodo of nodos) {
    const rol = matchRolPorCargo(nodo.cargoLabel)
    if (!rol) {
      cargoLabelsNoReconocidos.push({ nodoId: nodo.id, cargoLabel: nodo.cargoLabel })
      continue
    }
    if (!nodo.userId) continue // vacante: el rol existe pero nadie lo ocupa todavía
    if (!candidatosPorRol.has(rol)) candidatosPorRol.set(rol, [])
    candidatosPorRol.get(rol)!.push(nodo)
  }

  for (const [rol, candidatos] of candidatosPorRol) {
    const elegido = [...candidatos].sort((a, b) => a.orden - b.orden)[0]
    porRol.set(rol, {
      userId: elegido.userId!,
      nombre: elegido.user?.name ?? '',
      nodoId: elegido.id,
    })
  }

  return { porRol, cargoLabelsNoReconocidos }
}
