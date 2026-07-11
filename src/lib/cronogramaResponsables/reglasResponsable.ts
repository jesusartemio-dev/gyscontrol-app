/**
 * Regla de negocio GLOBAL (igual para todo proyecto): qué rol organizacional
 * es responsable de cada EDT del catálogo, y las excepciones puntuales por
 * tarea dentro de un EDT. Lo único que varía por proyecto es QUIÉN ocupa
 * cada rol — eso se resuelve en resolverOrganigrama.ts, nunca acá.
 *
 * Reemplaza la invención de responsables por IA (Matriz de Comunicaciones) y
 * el matcheo difuso contra filas de la matriz (autoasignarResponsables.ts,
 * eliminado) — mismo espíritu que derivarEdtsSoporte.ts: reglas duras en
 * código, nunca vía LLM, siempre editables después por el usuario.
 */

export type RolResponsable = 'gestor' | 'residente' | 'supervisor' | 'ssoma' | 'cadista' | 'logistica'

export const ROL_RESPONSABLE_LABELS: Record<RolResponsable, string> = {
  gestor: 'Gestor de Proyectos',
  residente: 'Residente',
  supervisor: 'Supervisor',
  ssoma: 'SSOMA',
  cadista: 'Cadista',
  logistica: 'Logística',
}

/**
 * Tabla base EDT -> rol. Cubre solo los 11 códigos confirmados del catálogo
 * renovado (ver conteo real: 13 EDTs totales, PRE y GEN son legacy sin
 * servicios y quedan deliberadamente FUERA de esta tabla — se evaluarán en
 * la depuración de catálogo, junto con "CIG - Eliminar"). Un EDT no listado
 * acá SIEMPRE devuelve null desde calcularRolResponsable (fail-safe: sin
 * asignar + advertencia visible, nunca se inventa ni se adivina).
 */
const REGLA_ROL_POR_EDT: Record<string, RolResponsable> = {
  GES: 'gestor',
  PRO: 'gestor',
  CIE: 'gestor',
  ING: 'residente',
  PLA: 'residente',
  HMI: 'residente',
  TAB: 'residente',
  PLC: 'residente',
  CON: 'supervisor',
  CMM: 'supervisor',
  SEG: 'ssoma',
}

export interface ContextoRolResponsable {
  edtCodigo: string
  /** Nombre real de la Actividad (ej. "Cierre Técnico", "Cierre de Gestión") — usado por la excepción de CIE. */
  actividadNombre?: string
  /** Nombre real de la Tarea — sin uso hoy (SEG ya no tiene excepción por tarea), se conserva por si una excepción futura la necesita. */
  tareaNombre?: string
}

const RX_CIE_TECNICO = /t[eé]cnico/i
const RX_CIE_GESTION = /gesti[oó]n/i

/**
 * Rol responsable para un EDT (o, si se pasa actividad, con la excepción de
 * CIE aplicada). Devuelve null cuando el EDT no está en la tabla — el
 * caller SIEMPRE debe tratar null como "sin asignar + advertencia", nunca
 * como "usar un rol por defecto".
 */
export function calcularRolResponsable(ctx: ContextoRolResponsable): RolResponsable | null {
  if (ctx.edtCodigo === 'CIE' && ctx.actividadNombre) {
    if (RX_CIE_TECNICO.test(ctx.actividadNombre)) return 'supervisor'
    if (RX_CIE_GESTION.test(ctx.actividadNombre)) return 'gestor'
  }
  return REGLA_ROL_POR_EDT[ctx.edtCodigo] ?? null
}
