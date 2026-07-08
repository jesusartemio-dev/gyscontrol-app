import type { PlanRaciRol } from '@/types/planTrabajo'

/**
 * Tipo de EDT (gestión vs. campo) — heurística determinista por nombre.
 *
 * NO ENCONTRADO: el catálogo `Edt` no tiene un campo `codigo`/`tipo` explícito
 * (solo `nombre` único), así que el código-EDT (CON, COM, ING, PLAN...) que la
 * IA antes "extraía" del nombre no es un dato de BD real. Esta heurística por
 * palabras clave reemplaza esa inferencia de la IA por una regla determinista
 * y testeable en código — pero sigue siendo una heurística de texto, no un
 * campo estructurado. Recomendación a futuro: agregar `Edt.tipoTrabajo` como
 * enum ('gestion' | 'campo') en el catálogo maestro para eliminar la
 * ambigüedad por completo (requiere migración Prisma, fuera de alcance aquí).
 */
const PALABRAS_CLAVE_CAMPO = [
  'construc', 'comision', 'montaje', 'instalac', 'ejecuc', 'obra', 'campo',
]
const PALABRAS_CLAVE_GESTION = [
  'planific', 'ingenier', 'procura', 'gesti', 'diseñ', 'diseno', 'estudio',
]

export type TipoEdt = 'gestion' | 'campo'

export function clasificarTipoEdt(nombreEdt: string): TipoEdt {
  const n = nombreEdt.toLowerCase()
  if (PALABRAS_CLAVE_CAMPO.some(k => n.includes(k))) return 'campo'
  if (PALABRAS_CLAVE_GESTION.some(k => n.includes(k))) return 'gestion'
  return 'gestion' // default conservador: sin match, se trata como gestión
}

export interface ContextoRolRaci {
  cargoLabel: string
  tipoEdt: TipoEdt
  esResponsableDelEdt: boolean
}

interface ReglaRaci {
  patron: RegExp
  calcular: (ctx: ContextoRolRaci) => PlanRaciRol
}

/**
 * Tabla de mapeo cargoLabel → rol RACI, configurable en código.
 * Se evalúa en orden — el primer patrón que matchee gana.
 *
 * Los patrones cubren el vocabulario REAL del organigrama estándar de GYS
 * (verificado contra PlantillaOrganigrama / ProyectoOrgNodo en BD): usa
 * sustantivos de área ("GERENCIA GENERAL", "HSEQ") en vez de títulos de
 * persona ("Gerente", "Seguridad") — los patrones originales basados solo en
 * el prompt de IA no cubrían esto y dejaban casi todo en "I" por defecto.
 *
 * Semilla (informe §6 / cambio #13, ajustada a cargos reales):
 *   Gerencia* / Gerente*                        → A en todo
 *   Gestor/Supervisor de Proyecto*               → R en EDTs de gestión, C en EDTs de campo
 *   Residente / Supervisor de campo/Construcción* → R en EDTs de campo, I en EDTs de gestión
 *   Técnico*                                     → R en el EDT del que es responsable o en
 *                                                   cualquier EDT de campo (fallback si el
 *                                                   cronograma no tiene responsableId cargado), I en el resto
 *   Seguridad* / HSEQ                            → C en todo
 *   Comercial* / Logístic*                       → I en todo
 * Cargos que no matchean ninguna regla → I en todo + advertencia (ver calcularDatos.ts).
 */
export const REGLAS_RACI_CARGO: ReglaRaci[] = [
  { patron: /gerenc|gerente/i, calcular: () => 'A' },
  { patron: /(gestor|supervisor\s+de\s+proyecto)/i, calcular: ctx => (ctx.tipoEdt === 'gestion' ? 'R' : 'C') },
  { patron: /(residente|supervisor\s+de\s+campo|construcci[oó]n)/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : 'I') },
  { patron: /t[eé]cnico/i, calcular: ctx => (ctx.esResponsableDelEdt || ctx.tipoEdt === 'campo' ? 'R' : 'I') },
  { patron: /seguridad|hseq/i, calcular: () => 'C' },
  { patron: /(comercial|log[ií]stic)/i, calcular: () => 'I' },
]

/** Devuelve el rol RACI para un cargo/EDT, o null si el cargo no matchea ninguna regla. */
export function calcularRolRaci(ctx: ContextoRolRaci): PlanRaciRol | null {
  for (const regla of REGLAS_RACI_CARGO) {
    if (regla.patron.test(ctx.cargoLabel)) return regla.calcular(ctx)
  }
  return null
}
