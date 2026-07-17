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

export interface ContextoRolRaci {
  cargoLabel: string
  tipoEdt: TipoEdt
  esResponsableDelEdt: boolean
  esEdtDeSeguridad: boolean
  esEdtDeDocumentacion: boolean
}

interface ReglaRaci {
  patron: RegExp
  calcular: (ctx: ContextoRolRaci) => PlanRaciRol
}

/** Prioridad de "Aprobador" cuando 2+ cargos de gerencia matchean en el mismo EDT (ver calcularMatrizRaci). */
export function prioridadAprobador(cargoLabel: string): number {
  if (/proyecto/i.test(cargoLabel)) return 2 // Gerencia de Proyectos — máxima prioridad
  if (/gerenc|gerente/i.test(cargoLabel)) return 1 // Gerencia General u otra gerencia
  return 0
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
 * Semilla (informe §6 / cambio #13, ajustada a auditoría real — addendum D):
 *   Gerencia* / Gerente*                    → A (máximo uno por EDT, ver calcularMatrizRaci)
 *   Gestor/Supervisor de Proyecto*           → R en EDTs de gestión, C en EDTs de campo
 *   Seguridad / SSOMA / SSO / HSEQ / HSE     → C en todo, R en el EDT de Seguridad
 *   Residente*                               → R en EDTs de EJECUCIÓN (CON/CMN), C en el resto
 *   Supervisor* (genérico) / Construcción*   → R en EDTs de campo, I en el resto
 *   Técnico*                                 → R en el EDT del que es responsable o en
 *                                              cualquier EDT de campo (fallback si el
 *                                              cronograma no tiene responsableId cargado), I en el resto
 *   Cadista* / Dibujante* / CAD              → R en EDTs de planos/dibujo/documentación, I en el resto
 *   Comercial* / Logístic*                   → I en todo
 * Cargos que no matchean ninguna regla → I en todo + advertencia (ver calcularDatos.ts).
 *
 * IMPORTANTE — orden de evaluación (el primer patrón que matchee gana):
 * "seguridad|ssoma|..." va ANTES del patrón genérico de "supervisor" para que
 * "Supervisor de Seguridad (HSEQ)" caiga en la regla de seguridad; "residente"
 * tiene su propia regla (C en el resto, no I) separada del "supervisor"
 * genérico (I en el resto) — ver addendum D.3.
 */
export const REGLAS_RACI_CARGO: ReglaRaci[] = [
  { patron: /gerenc|gerente/i, calcular: () => 'A' },
  { patron: /(gestor|supervisor\s+de\s+proyecto)/i, calcular: ctx => (ctx.tipoEdt === 'gestion' ? 'R' : 'C') },
  { patron: /seguridad|ssoma|sso|hseq|hse/i, calcular: ctx => (ctx.esEdtDeSeguridad ? 'R' : 'C') },
  { patron: /residente/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : 'C') },
  { patron: /(supervisor|construcci[oó]n)/i, calcular: ctx => (ctx.tipoEdt === 'campo' ? 'R' : 'I') },
  { patron: /t[eé]cnico/i, calcular: ctx => (ctx.esResponsableDelEdt || ctx.tipoEdt === 'campo' ? 'R' : 'I') },
  { patron: /cadista|dibujante|cad\b/i, calcular: ctx => (ctx.esEdtDeDocumentacion ? 'R' : 'I') },
  { patron: /(comercial|log[ií]stic)/i, calcular: () => 'I' },
]

/** Devuelve el rol RACI para un cargo/EDT, o null si el cargo no matchea ninguna regla. */
export function calcularRolRaci(ctx: ContextoRolRaci): PlanRaciRol | null {
  for (const regla of REGLAS_RACI_CARGO) {
    if (regla.patron.test(ctx.cargoLabel)) return regla.calcular(ctx)
  }
  return null
}
