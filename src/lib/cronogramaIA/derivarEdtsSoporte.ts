/**
 * La cotización comercial (obtenerEdtsComercialesProyecto) resuelve los EDTs
 * de ENTREGABLES realmente vendidos (CON, ING, PLA, TAB, PLC, HMI, ...).
 * Pero hay EDTs de SOPORTE que casi nunca son una partida propia de la
 * cotización y aun así son obligatorios (o casi seguros) según el alcance:
 * GES (gestión) y CIE (cierre) siempre aplican; SEG (seguridad/HSE) y PRO
 * (procura) se derivan de si hay trabajo en campo/taller o suministro de
 * materiales; CMM (comisionamiento) se sugiere (no se fuerza) cuando hay
 * montaje eléctrico/instrumentación/control en el alcance (CON, TAB, PLC o
 * HMI) y no viene ya como partida explícita en la cotización — casi todo
 * ese tipo de trabajo termina en energización/pruebas, tenga o no tableros
 * nuevos o control programable.
 *
 * Este módulo también decide, dentro de CMM, qué tareas se preseleccionan
 * según el sub-alcance real (evaluarSubalcanceCMM/aplicarSubalcanceCMM) —
 * CMM tiene solo 12 tareas estables, así que basta una tabla estática por
 * nombre en vez de campos nuevos en el catálogo o una llamada a IA.
 *
 * Reglas duras en código — nunca vía LLM. Cada EDT/tarea derivada sigue
 * siendo editable por el usuario (Paso 1 para EDTs, Paso 2/3 para tareas) —
 * esto solo decide la preselección y el motivo mostrado, no bloquea nada.
 */

import type { CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'

export type OrigenEdtSugerido = 'cotizacion' | 'regla-siempre' | 'regla-derivada' | 'regla-sugerencia'

export interface EdtSugeridoConOrigen {
  id: string
  nombre: string
  origen: OrigenEdtSugerido
  motivo?: string
}

const EDTS_SIEMPRE: Record<string, string> = {
  GES: 'Gestión del proyecto — siempre aplica.',
  CIE: 'Cierre del proyecto — siempre aplica.',
}

/** CON/TAB = trabajo físico en campo o taller; CMM = comisionamiento en sitio. */
const EDTS_TRIGGER_SEG = ['CON', 'TAB', 'CMM'] as const
/** CON/TAB implican suministro de materiales/equipos que hay que procurar. */
const EDTS_TRIGGER_PRO = ['CON', 'TAB'] as const
/**
 * CON, no solo TAB/PLC/HMI: casi todo montaje eléctrico/instrumentación en
 * campo termina en precomisionamiento (energización, megado, pruebas),
 * tenga o no tableros nuevos o control programable en el alcance.
 */
const EDTS_TRIGGER_CMM_SUGERENCIA = ['CON', 'TAB', 'PLC', 'HMI'] as const

function motivoSeg(triggers: string[]): string {
  return `Documentos de seguridad (HSE) requeridos para trabajo en campo/taller (${triggers.join(', ')}) — no se cotiza como partida aparte pero es obligatorio para ingresar a planta.`
}
function motivoPro(triggers: string[]): string {
  return `Ciclo de procura (cotización → OC → recepción) requerido por el suministro de materiales/equipos del alcance (${triggers.join(', ')}) — no se cotiza como partida aparte.`
}
function motivoCmmSugerencia(triggers: string[]): string {
  return `Alcance eléctrico/de instrumentación/de control detectado (${triggers.join(', ')}) — casi siempre termina en precomisionamiento (energización, megado, pruebas). Se sugiere Comisionamiento aunque no esté cotizado explícitamente. Confirma si aplica.`
}

/**
 * Deriva los EDTs de soporte a partir de los EDTs de entregables ya
 * resueltos desde la cotización (edtsBaseIds). Devuelve la lista completa
 * (entregables + soporte) con su origen, en el mismo orden en que deben
 * mostrarse: primero los de cotización, luego los derivados por regla.
 */
export function derivarEdtsSoporte(
  edtsBaseIds: string[],
  edtsCatalogo: { id: string; nombre: string }[]
): EdtSugeridoConOrigen[] {
  const idPorNombre = new Map(edtsCatalogo.map(e => [e.nombre, e.id]))
  const nombrePorId = new Map(edtsCatalogo.map(e => [e.id, e.nombre]))
  const nombresPresentes = new Set(edtsBaseIds.map(id => nombrePorId.get(id)).filter((n): n is string => !!n))

  const resultado: EdtSugeridoConOrigen[] = edtsBaseIds
    .map(id => ({ id, nombre: nombrePorId.get(id) ?? '', origen: 'cotizacion' as const }))
    .filter(e => e.nombre)

  function agregarSiFalta(nombre: string, origen: OrigenEdtSugerido, motivo?: string) {
    if (nombresPresentes.has(nombre)) return
    const id = idPorNombre.get(nombre)
    if (!id) return
    resultado.push({ id, nombre, origen, motivo })
    nombresPresentes.add(nombre)
  }

  for (const [nombre, motivo] of Object.entries(EDTS_SIEMPRE)) {
    agregarSiFalta(nombre, 'regla-siempre', motivo)
  }

  const triggersSeg = EDTS_TRIGGER_SEG.filter(n => nombresPresentes.has(n))
  if (triggersSeg.length > 0) {
    agregarSiFalta('SEG', 'regla-derivada', motivoSeg(triggersSeg))
  }

  const triggersPro = EDTS_TRIGGER_PRO.filter(n => nombresPresentes.has(n))
  if (triggersPro.length > 0) {
    agregarSiFalta('PRO', 'regla-derivada', motivoPro(triggersPro))
  }

  const triggersCmm = EDTS_TRIGGER_CMM_SUGERENCIA.filter(n => nombresPresentes.has(n))
  if (triggersCmm.length > 0) {
    agregarSiFalta('CMM', 'regla-sugerencia', motivoCmmSugerencia(triggersCmm))
  }

  return resultado
}

// --- Sub-alcance de CMM: qué tareas del comisionamiento se preseleccionan ---

export interface SubalcanceCMM {
  instrumentacion: boolean
  plcOHmi: boolean
  neumatica: boolean
  proceso: boolean
}

/**
 * Tabla estática por nombre real de tarea (las 12 de CMM en el catálogo).
 * Una tarea sin entrada acá (protocolos, pruebas eléctricas, energización,
 * informe — o cualquier tarea nueva que se agregue a futuro) queda SIEMPRE
 * incluida: sin condición = sin riesgo de excluir algo por error.
 *
 * ATENCIÓN: esta tabla matchea por nombre real de las tareas del catálogo.
 * Si se renombra una tarea de CMM en el catálogo, hay que actualizar esta
 * tabla — de lo contrario la tarea caerá al grupo "siempre incluida" por el
 * fail-safe.
 */
const REGLA_TAREA_CMM: Record<string, keyof SubalcanceCMM | undefined> = {
  'Calibración de Instrumentos': 'instrumentacion',
  'Pruebas de Lazo (Loop Check)': 'instrumentacion',
  'Comisionamiento de Comunicaciones': 'plcOHmi',
  'Pruebas de Enclavamientos': 'plcOHmi',
  'Pruebas Neumáticas': 'neumatica',
  'Comisionamiento en Frío': 'proceso',
  'Comisionamiento en Caliente': 'proceso',
  'Puesta en Marcha del Sistema': 'proceso',
}

const MOTIVO_EXCLUSION_CMM: Record<keyof SubalcanceCMM, string> = {
  instrumentacion: 'No se detectó instrumentación en el alcance (tag "Instrumentacion" en ING/PLA) — confirma si aplica.',
  plcOHmi: 'No hay PLC ni HMI en el alcance seleccionado — confirma si aplica.',
  neumatica: 'No se detectó alcance neumático en la descripción libre del Paso 1 — confirma si aplica.',
  proceso: 'No se detectó arranque de proceso/equipos en la descripción libre del Paso 1 — confirma si aplica.',
}

const RX_NEUMATICA = /neum[aá]tic/i
const RX_PROCESO = /proceso|arranque de (equipo|planta|l[ií]nea)|puesta en marcha de (planta|producci[oó]n)/i

/**
 * Evalúa el sub-alcance a partir de los servicios/EDTs YA seleccionados en
 * el Paso 1 (nunca de CMM mismo — si se buscara en el propio catálogo de
 * CMM, "proceso"/"neumática" siempre darían true por el texto de sus
 * propias tareas) y de la descripción libre del alcance.
 */
export function evaluarSubalcanceCMM(
  serviciosSeleccionadosSinCmm: Pick<CatalogoServicioParaWizard, 'actividadTag'>[],
  edtsNombresSeleccionados: string[],
  alcanceLibre: string
): SubalcanceCMM {
  return {
    instrumentacion: serviciosSeleccionadosSinCmm.some(s => s.actividadTag.includes('Instrumentacion')),
    plcOHmi: edtsNombresSeleccionados.includes('PLC') || edtsNombresSeleccionados.includes('HMI'),
    neumatica: RX_NEUMATICA.test(alcanceLibre),
    proceso: RX_PROCESO.test(alcanceLibre),
  }
}

/**
 * Marca incluida=false (con motivoExclusion) las tareas de CMM cuyo
 * sub-alcance no se detectó — nunca pisa una exclusión previa (ej.
 * filtroAlcance: si la tarea ya llega excluida, esta regla ni participa en
 * la decisión, así que no se le atribuye `reglaClave`). Todo sigue editable
 * en el Paso 2/3: esto solo decide qué checkbox arranca pre-marcado. Toda
 * tarea que SÍ fue decidida por esta regla queda taggeada con `reglaClave` +
 * `incluidaPorRegla` (snapshot inmutable) para poder auditar después si el
 * usuario forzó la decisión (ver CronogramaIATareaDecision).
 */
export function aplicarSubalcanceCMM(tareas: TareaPropuesta[], subalcance: SubalcanceCMM): TareaPropuesta[] {
  return tareas.map(t => {
    if (!t.incluida) return t
    const clave = REGLA_TAREA_CMM[t.nombre]
    if (!clave) return t
    const reglaClave = `cmm.${clave}`
    const incluidaPorRegla = subalcance[clave]
    if (incluidaPorRegla) return { ...t, reglaClave, incluidaPorRegla }
    return { ...t, incluida: false, motivoExclusion: MOTIVO_EXCLUSION_CMM[clave], reglaClave, incluidaPorRegla }
  })
}

// --- Sub-alcance de disciplinas ING/PLA (Control, Instrumentación) ---
//
// A diferencia de CMM (12 tareas fijas, tabla por nombre exacto), acá el
// sub-alcance se decide a nivel de la Actividad completa agrupada por tag:
// TODAS las tareas de "Disciplina Control" o "Disciplina Instrumentación"
// comparten un mismo veredicto — la Actividad queda siempre visible en el
// Paso 2 (aunque termine con 0 tareas incluidas), nunca desaparece sin
// explicación. [Electrico]/[Generales]/[Protocolos]/[Envios] no pasan por
// acá: siempre se preseleccionan cuando el EDT está activo.

export interface SubalcanceDisciplina {
  control: boolean
  instrumentacion: boolean
}

const RX_CONTROL_LIBRE = /control programable|scada/i
const RX_INSTRUMENTOS_LIBRE = /instrumentos?|transmisor(es)?|v[aá]lvulas?/i

const MOTIVO_DISCIPLINA: Record<keyof SubalcanceDisciplina, string> = {
  control: 'No hay PLC/HMI en el alcance seleccionado ni menciones de control programable/SCADA en la descripción libre del Paso 1 — confirma si aplica.',
  instrumentacion: 'No se detectaron instrumentos/transmisores/válvulas en la descripción libre del Paso 1 — confirma si aplica.',
}

/**
 * Evalúa si hay control programable/instrumentación en el alcance a partir
 * de los EDTs YA seleccionados (PLC/HMI) y la descripción libre del Paso 1
 * — nunca del propio ING/PLA, para no ser circular.
 */
export function evaluarSubalcanceDisciplinas(edtsNombresSeleccionados: string[], alcanceLibre: string): SubalcanceDisciplina {
  return {
    control: edtsNombresSeleccionados.includes('PLC') || edtsNombresSeleccionados.includes('HMI') || RX_CONTROL_LIBRE.test(alcanceLibre),
    instrumentacion: RX_INSTRUMENTOS_LIBRE.test(alcanceLibre),
  }
}

/**
 * Aplica el veredicto de sub-alcance a TODAS las tareas de una Actividad de
 * ING/PLA agrupada por tag "Control" o "Instrumentacion" — mismo criterio de
 * no pisar una exclusión previa (ej. filtroAlcance=detalle sin el toggle
 * activado) que aplicarSubalcanceCMM, así que una tarea [Detalle] de Control
 * solo termina incluida si AMBAS condiciones se cumplen (detalle=ON Y
 * disciplina activa).
 */
export function aplicarSubalcanceDisciplina(
  edtNombre: 'ING' | 'PLA',
  tagDisciplina: 'Control' | 'Instrumentacion',
  tareas: TareaPropuesta[],
  subalcance: SubalcanceDisciplina
): TareaPropuesta[] {
  const clave: keyof SubalcanceDisciplina = tagDisciplina === 'Control' ? 'control' : 'instrumentacion'
  const reglaClave = `${edtNombre.toLowerCase()}.${clave}`
  const incluidaPorRegla = subalcance[clave]
  return tareas.map(t => {
    if (!t.incluida) return t
    if (incluidaPorRegla) return { ...t, reglaClave, incluidaPorRegla }
    return { ...t, incluida: false, motivoExclusion: MOTIVO_DISCIPLINA[clave], reglaClave, incluidaPorRegla }
  })
}

// --- Sub-alcance por tarea dentro de [Protocolos] de ING ---

export interface SubalcanceProtocolosIng {
  cableado: boolean
  canalizacion: boolean
  fuerza: boolean
}

const RX_TENDIDO = /tendido|cableado/i
const RX_CANALIZACION = /canalizaci[oó]n|bandejas?|tuber[ií]as? conduit|conduit/i
const RX_FUERZA = /cables? de fuerza|circuitos? de fuerza/i

/** Tabla estática por nombre real (las 3 tareas de [Protocolos] en ING) — mismo fail-safe que CMM: nombre no contemplado = siempre incluida. */
const REGLA_TAREA_PROTOCOLOS_ING: Record<string, keyof SubalcanceProtocolosIng | undefined> = {
  'Protocolo de Cableado': 'cableado',
  'Protocolo de Tuberías y Soportes': 'canalizacion',
  'Protocolo de Megado': 'fuerza',
}

const MOTIVO_PROTOCOLOS_ING: Record<keyof SubalcanceProtocolosIng, string> = {
  cableado: 'No se detectó tendido/cableado en la descripción libre del Paso 1 — confirma si aplica.',
  canalizacion: 'No se detectó canalización (bandejas/tuberías conduit) en la descripción libre — confirma si aplica.',
  fuerza: 'No se detectaron cables de fuerza en la descripción libre — confirma si aplica.',
}

export function evaluarSubalcanceProtocolosIng(alcanceLibre: string): SubalcanceProtocolosIng {
  return {
    cableado: RX_TENDIDO.test(alcanceLibre),
    canalizacion: RX_CANALIZACION.test(alcanceLibre),
    fuerza: RX_FUERZA.test(alcanceLibre),
  }
}

export function aplicarSubalcanceProtocolosIng(tareas: TareaPropuesta[], subalcance: SubalcanceProtocolosIng): TareaPropuesta[] {
  return tareas.map(t => {
    if (!t.incluida) return t
    const clave = REGLA_TAREA_PROTOCOLOS_ING[t.nombre]
    if (!clave) return t
    const reglaClave = `ing.protocolo.${clave}`
    const incluidaPorRegla = subalcance[clave]
    if (incluidaPorRegla) return { ...t, reglaClave, incluidaPorRegla }
    return { ...t, incluida: false, motivoExclusion: MOTIVO_PROTOCOLOS_ING[clave], reglaClave, incluidaPorRegla }
  })
}
