/**
 * La cotización comercial (obtenerEdtsComercialesProyecto) resuelve los EDTs
 * de ENTREGABLES realmente vendidos (CON, ING, PLA, TAB, PLC, HMI, ...).
 * Pero hay EDTs de SOPORTE que casi nunca son una partida propia de la
 * cotización y aun así son obligatorios (o casi seguros) según el alcance:
 * GES (gestión) y CIE (cierre) siempre aplican; SEG (seguridad/HSE) y PRO
 * (procura) se derivan de si hay trabajo en campo/taller o suministro de
 * materiales; CMM (comisionamiento) se sugiere (no se fuerza) cuando hay
 * alcance eléctrico/de control pero no viene explícito en la cotización.
 *
 * Reglas duras en código — nunca vía LLM. Cada EDT derivado sigue siendo
 * editable por el usuario en el Paso 1 (esto solo decide la preselección y
 * el motivo mostrado, no bloquea nada).
 */

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
/** Tableros armados o controladores/HMI presentes → hay algo que comisionar. */
const EDTS_TRIGGER_CMM_SUGERENCIA = ['TAB', 'PLC', 'HMI'] as const

function motivoSeg(triggers: string[]): string {
  return `Documentos de seguridad (HSE) requeridos para trabajo en campo/taller (${triggers.join(', ')}) — no se cotiza como partida aparte pero es obligatorio para ingresar a planta.`
}
function motivoPro(triggers: string[]): string {
  return `Ciclo de procura (cotización → OC → recepción) requerido por el suministro de materiales/equipos del alcance (${triggers.join(', ')}) — no se cotiza como partida aparte.`
}
function motivoCmmSugerencia(triggers: string[]): string {
  return `Alcance eléctrico/de control detectado (${triggers.join(', ')}) — se sugiere Comisionamiento aunque no esté cotizado explícitamente. Confirma si aplica.`
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
