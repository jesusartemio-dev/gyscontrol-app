import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import {
  MAX_REINTENTOS,
  validarAsignacionEsquema,
  type AsignacionPropuestaIA,
  type ResultadoValidacionGrupos,
} from './validarPropuestasIA'
import {
  SYSTEM_ASIGNACION_CON,
  SYSTEM_ASIGNACION_PRO,
  buildUserAsignacionCon,
  buildUserAsignacionPro,
  type ContextoCotizacionParaPrompt,
  type EquipoRealParaPrompt,
  type TareaParaPrompt,
} from './prompts'
import type { CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

type EdtConEsquema = 'CON' | 'PRO'

interface GenerarAsignacionOpciones {
  edtNombre: EdtConEsquema
  nombresActividades: string[]
  serviciosPermitidos: CatalogoServicioParaWizard[]
  alcanceLibre: string
  cotizacion: ContextoCotizacionParaPrompt | null
  equiposReales?: EquipoRealParaPrompt[] | null
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'>
  userId: string
  proyectoId: string
  signal?: AbortSignal
}

/**
 * Etapa B del flujo de 2 etapas de CON/PRO: asigna tareas (por id) a los
 * nombres de Actividad YA FIJOS (el usuario eligió/editó un esquema de la
 * Etapa A) — mismo bucle de reintento-por-ids-inventados que
 * generarPropuestaConIA, pero validando también que cada actividadNombre
 * devuelto sea uno de los nombresActividades dados (validarAsignacionEsquema).
 */
export async function generarAsignacionConEsquema(opciones: GenerarAsignacionOpciones): Promise<ResultadoValidacionGrupos> {
  const {
    edtNombre,
    nombresActividades,
    serviciosPermitidos,
    alcanceLibre,
    cotizacion,
    equiposReales = null,
    config,
    userId,
    proyectoId,
    signal,
  } = opciones

  if (serviciosPermitidos.length === 0) {
    return { actividades: [], tareaIdsNoAsignadas: [], tareaIdsInventados: [], advertencias: [] }
  }

  const tareasParaPrompt: TareaParaPrompt[] = serviciosPermitidos.map(s => ({ id: s.id, nombre: s.nombre, descripcion: s.descripcion }))
  const system = edtNombre === 'CON' ? SYSTEM_ASIGNACION_CON : SYSTEM_ASIGNACION_PRO

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let notaCorrectiva = ''
  let resultado: ResultadoValidacionGrupos = { actividades: [], tareaIdsNoAsignadas: [], tareaIdsInventados: [], advertencias: [] }

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const userPrompt =
      edtNombre === 'CON'
        ? buildUserAsignacionCon(tareasParaPrompt, nombresActividades, alcanceLibre, cotizacion, notaCorrectiva)
        : buildUserAsignacionPro(tareasParaPrompt, nombresActividades, alcanceLibre, cotizacion, equiposReales, notaCorrectiva)

    const inicio = Date.now()
    let response: Anthropic.Message
    try {
      response = await anthropic.messages.create(
        { model: MODELS.sonnet, max_tokens: 4096, system, messages: [{ role: 'user', content: userPrompt }] },
        { signal }
      )
    } catch (e) {
      resultado = validarAsignacionEsquema([], nombresActividades, serviciosPermitidos, config, edtNombre)
      resultado.advertencias.push(`${edtNombre}: error llamando a la IA (${e instanceof Error ? e.message : 'desconocido'}) — se usó agrupación "Sin agrupar".`)
      return resultado
    }

    trackUsage({
      userId,
      tipo: `cronograma-planificacion.asignacion-${edtNombre.toLowerCase()}`,
      modelo: MODELS.sonnet,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId, edtNombre, intento },
    })

    if (response.stop_reason === 'max_tokens') {
      notaCorrectiva = '\n\nTu respuesta anterior se truncó por exceder el límite de tokens. Sé más breve.'
      continue
    }

    let asignaciones: AsignacionPropuestaIA[] = []
    try {
      const parsed = parseJsonIA(extraerTexto(response)) as { asignaciones?: AsignacionPropuestaIA[] }
      asignaciones = parsed.asignaciones ?? []
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
      continue
    }

    resultado = validarAsignacionEsquema(asignaciones, nombresActividades, serviciosPermitidos, config, edtNombre)

    if (resultado.tareaIdsInventados.length === 0) {
      return resultado
    }

    notaCorrectiva = `\n\nTu respuesta anterior incluía ids que NO existen en la lista de tareas candidatas: ${JSON.stringify(resultado.tareaIdsInventados)}. Usá SOLO los ids que aparecen en la lista de tareas candidatas del input, copiados tal cual.`
  }

  return resultado
}
