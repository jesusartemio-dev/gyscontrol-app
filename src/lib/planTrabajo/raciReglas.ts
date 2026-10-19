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

/** El EDT cuyo nombre refiere a Seguridad/SSOMA — usado para darle R (no solo C) al cargo de seguridad ahí. */
export function esEdtDeSeguridad(nombreEdt: string): boolean {
  return /segur/i.test(nombreEdt)
}

/**
 * EDT de Construcción o Comisionamiento específicamente (CON/CMN del manual
 * de referencia) — MÁS ESTRECHO que `clasificarTipoEdt(...) === 'campo'`
 * (que también incluye "montaje", "instalación", "obra" genéricos). Usado
 * SOLO por el gráfico de HH por actividad (§13.3) — no reutilizar
 * para RACI, que ya tiene su propia noción (más amplia) de "campo".
 */
export function esEdtDeConstruccionOComisionamiento(nombreEdt: string): boolean {
  const n = nombreEdt.toLowerCase()
  return n.includes('construc') || n.includes('comision')
}

/** El EDT cuyo nombre refiere a planos/dibujo/documentación — usado para darle R (no solo I) al Cadista ahí. */
export function esEdtDeDocumentacion(nombreEdt: string): boolean {
  return /plano|dibujo|documentaci/i.test(nombreEdt)
}

/** EDT de compras/servicios (PRO "Suministro de Equipos", SER "Servicios y Alquileres") — Logística es C ahí. */
export function esEdtDeLogistica(nombreEdt: string): boolean {
  return /suministro|procura|alquiler/i.test(nombreEdt)
}

/** EDT de arranque o cierre del proyecto (GES, CIE) — Comercial queda Informado ahí. */
export function esEdtDeArranqueOCierre(nombreEdt: string): boolean {
  return /planificaci[oó]n del proyecto|cierre/i.test(nombreEdt)
}

/**
 * Clasificación del EDT para la RACI: por código de catálogo (CON, PLA…) si
 * viene, y si no por palabras clave del nombre.
 */
export function clasificarEdtRaci(nombreEdt: string, codigoEdt?: string | null) {
  const c = (codigoEdt ?? '').toUpperCase()
  return {
    tipoEdt: (['CON', 'CMM', 'COM'].includes(c) ? 'campo' : c ? 'gestion' : clasificarTipoEdt(nombreEdt)) as TipoEdt,
    esEdtDeSeguridad: ['SEG', 'SSO'].includes(c) || esEdtDeSeguridad(nombreEdt),
    esEdtDeDocumentacion: c === 'PLA' || esEdtDeDocumentacion(nombreEdt),
    esEdtDeLogistica: ['PRO', 'SER'].includes(c) || esEdtDeLogistica(nombreEdt),
    esEdtDeArranqueOCierre: ['GES', 'CIE'].includes(c) || esEdtDeArranqueOCierre(nombreEdt),
  }
}

export interface ContextoRolRaci {
  cargoLabel: string
  tipoEdt: TipoEdt
  esEdtDeSeguridad: boolean
  esEdtDeDocumentacion: boolean
  esEdtDeLogistica?: boolean
  esEdtDeArranqueOCierre?: boolean
}

/** '' = la persona no participa en ese EDT (celda vacía). */
export type RolRaciCalculado = PlanRaciRol | ''

interface ReglaRaci {
  patron: RegExp
  calcular: (ctx: ContextoRolRaci) => RolRaciCalculado
}

/** Gerencia General no entra en la RACI (salvo que no haya Gerencia de Proyectos que apruebe). */
export function esGerenciaGeneral(cargoLabel: string): boolean {
  return /(gerencia|gerente)\s+general/i.test(cargoLabel)
}

/** Gerencia de Proyectos — el Aprobador (A) de todos los EDTs. */
export function esGerenciaDeProyectos(cargoLabel: string): boolean {
  return /(gerencia|gerente)\s+de\s+proyectos?/i.test(cargoLabel)
}

/** Prioridad de "Aprobador" cuando 2+ cargos de gerencia matchean en el mismo EDT (ver calcularMatrizRaci). */
export function prioridadAprobador(cargoLabel: string): number {
  if (/proyecto/i.test(cargoLabel)) return 2 // Gerencia de Proyectos — máxima prioridad
  if (/gerenc|gerente/i.test(cargoLabel)) return 1 // Gerencia General u otra gerencia
  return 0
}

/**
 * Rol RACI por CARGO, para quien no sale del cronograma. El orden completo
 * (ver calcularMatrizRaci):
 *   1. Gerencia de Proyectos → A en todos los EDTs (Gerencia General no entra).
 *   2. Responsable del EDT o de alguna de sus tareas en el cronograma → R.
 *   3. Esta tabla, por cargo (el primer patrón que matchee gana):
 *   Gestor/Supervisor de Proyecto            → C (su R ya sale del cronograma)
 *   Seguridad / SSOMA / SSO / HSEQ / HSE     → R en EDTs de Seguridad, C en los de campo
 *   Residente*                               → R en EDTs de campo (CON/CMM), C en el resto
 *   Supervisor* (genérico) / Construcción*   → R en EDTs de campo
 *   Técnico*                                 → R en EDTs de campo
 *   Cadista* / Dibujante* / CAD              → R en EDTs de planos
 *   Logístic*                                → C en Suministro de Equipos / Servicios y Alquileres
 *   Comercial*                               → I en Planificación del Proyecto y Cierre
 *   Otra gerencia                            → I
 * Fuera de eso la celda queda vacía ('' = no participa) — antes todo era "I"
 * y la matriz decía que todos se enteraban de todo.
 * Cargos que no matchean ninguna regla → vacío + advertencia (ver calcularDatos.ts).
 *
 * "seguridad|ssoma|..." va ANTES del patrón genérico de "supervisor" para que
 * "Supervisor de Seguridad (HSEQ)" caiga en la regla de seguridad.
 */
export const REGLAS_RACI_CARGO: ReglaRaci[] = [
  { patron: /(gestor|supervisor\s+de\s+proyecto)/i, calcular: () => 'C' },
  { patron: /seguridad|ssoma|sso|hseq|hse/i, calcular: ctx => (ctx.esEdtDeSeguridad ? 'R' : ctx.tipoEdt === 'campo' ? 'C' : '') },
  { patron: /residente/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : 'C') },
  { patron: /(supervisor|construcci[oó]n)/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : '') },
  { patron: /t[eé]cnico/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : '') },
  { patron: /cadista|dibujante|cad\b/i, calcular: ctx => (ctx.esEdtDeDocumentacion ? 'R' : '') },
  { patron: /log[ií]stic/i, calcular: ctx => (ctx.esEdtDeLogistica ? 'C' : '') },
  { patron: /comercial/i, calcular: ctx => (ctx.esEdtDeArranqueOCierre ? 'I' : '') },
  { patron: /gerenc|gerente/i, calcular: () => 'I' },
]

/** Devuelve el rol RACI por cargo para un EDT ('' = no participa), o null si el cargo no matchea ninguna regla. */
export function calcularRolRaci(ctx: ContextoRolRaci): RolRaciCalculado | null {
  for (const regla of REGLAS_RACI_CARGO) {
    if (regla.patron.test(ctx.cargoLabel)) return regla.calcular(ctx)
  }
  return null
}
