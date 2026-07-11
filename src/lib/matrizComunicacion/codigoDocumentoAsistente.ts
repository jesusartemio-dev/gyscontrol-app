/**
 * Asistente de codificación de documento por cliente — cada cliente publica su
 * propio estándar de códigos de entregable. Tabla de composición en código, NO
 * un motor genérico de plantillas de código (solo 2 clientes hoy: Nexa y
 * Qroma) — se generaliza el día que haya un 3er cliente con estándar propio.
 * El resultado siempre es solo una SUGERENCIA: `codigoDocumento` en
 * MatrizComunicacion sigue siendo 100% editable a mano.
 */

export const CONTRATISTA_SIGLAS = 'GYS'

const ETAPA_DIGITO: Record<string, string> = { FEL1: '1', FEL2: '2', FEL3: '3', 'E&C': '4' }

/** null = la etapa del proyecto no está en la tabla (cliente distinto de Nexa, o texto libre) — el usuario debe teclear el dígito a mano. */
export function digitoEtapa(etapa: string | null | undefined): string | null {
  if (!etapa) return null
  return ETAPA_DIGITO[etapa] ?? null
}

export interface ComposerInputNexa {
  /** Proyecto.codigoPEP — asignado por Nexa, nunca se genera acá. */
  pep: string
  /** Dígito de etapa (ver digitoEtapa) — 1/2/3/4. */
  etapaDigito: string
  /** Proyecto.areaSeccion — 4 dígitos del catálogo de Nexa. */
  area: string
  /** Correlativo administrado a mano por el usuario (sin registro de entregables todavía — TODO: administrar rangos por proyecto cuando exista esa feature). */
  correlativo: string
  /** Revisión alfanumérica del documento ("0"/"A"/"B"...). */
  revision: string
  /** Tipo de documento, default 'MX' (Matriz de Comunicaciones) — la tabla completa de Nexa incluye más (CL, CR, PX, DS, IF, VL...) para cuando se templeteen otros documentos. */
  tipoDocumento?: string
  /** Disciplina, default 'COR' (Coordinación/gestión — la que aplica a la Matriz). */
  disciplina?: string
}

/** `{TD}-{PEP}-{ETAPA}{CONTRATISTA}-{AREA}{DISC}{CORR}-R{REV}` — ej. real: MX-I790126021-3GYS-0240COR0001-R0 */
export function componerCodigoNexa(input: ComposerInputNexa): string {
  const td = input.tipoDocumento ?? 'MX'
  const disciplina = input.disciplina ?? 'COR'
  return `${td}-${input.pep}-${input.etapaDigito}${CONTRATISTA_SIGLAS}-${input.area}${disciplina}${input.correlativo}-R${input.revision}`
}

export interface ComposerInputQroma {
  /** Sin mapeo a Proyecto todavía — campo libre en el asistente (pendiente de acordar con el usuario). */
  planta: string
  /** Sin mapeo a Proyecto todavía — campo libre en el asistente (pendiente de acordar con el usuario). */
  codgen: string
  esp: string
  /** Tipo de documento para la Matriz en el estándar Qroma — TODAVÍA NO DECIDIDO ("OT u otro según acuerden"), nunca hardcodear un valor por defecto acá. */
  tipoDocumento: string
  correlativo: string
}

/** `{PLANTA}-{CODGEN}-{ESP}-{TD}-{CORR}` — ej. real: CPPQ-STD-0-CD-001 */
export function componerCodigoQroma(input: ComposerInputQroma): string {
  return `${input.planta}-${input.codgen}-${input.esp}-${input.tipoDocumento}-${input.correlativo}`
}

export type EstandarCliente = 'nexa' | 'qroma'

/**
 * Heurística pragmática (confirmada con el usuario): coincide con el patrón ya
 * usado en scripts/query-proyecto-nexa.ts de este repo. Sin campo nuevo en
 * Cliente — funciona ya. Riesgo aceptado: un nombre de cliente futuro que
 * contenga "nexa"/"qroma" por coincidencia lo confundiría (poco probable con
 * los clientes reales de hoy).
 */
export function detectarEstandarCliente(clienteNombre: string | null | undefined): EstandarCliente | null {
  if (!clienteNombre) return null
  const n = clienteNombre.toLowerCase()
  if (n.includes('nexa')) return 'nexa'
  if (n.includes('qroma')) return 'qroma'
  return null
}
