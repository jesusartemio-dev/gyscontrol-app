import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import {
  MAX_REINTENTOS,
  validarPropuestaGrupos,
  type GrupoPropuestoIA,
  type ResultadoValidacionGrupos,
} from './validarPropuestasIA'
import {
  SYSTEM_PROPUESTA_ZONAS_CON,
  SYSTEM_PROPUESTA_FAMILIAS_PRO,
  SYSTEM_PROPUESTA_INSTANCIAS_PLC,
  SYSTEM_PROPUESTA_INSTANCIAS_HMI,
  buildUserPropuestaZonasCon,
  buildUserPropuestaFamiliasPro,
  buildUserPropuestaInstanciasPlc,
  buildUserPropuestaInstanciasHmi,
  type ContextoCotizacionParaPrompt,
  type ContextoInstanciasParaPrompt,
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

type EdtConAgrupacionIA = 'CON' | 'PRO' | 'PLC' | 'HMI'

interface GenerarPropuestaOpciones {
  edtNombre: EdtConAgrupacionIA
  serviciosPermitidos: CatalogoServicioParaWizard[]
  alcanceLibre: string
  cotizacion: ContextoCotizacionParaPrompt | null
  contextoInstancias?: ContextoInstanciasParaPrompt | null
  /** Solo relevante para PRO — lista real de ProyectoEquipoCotizadoItem (señal fuerte, ver prompts.ts). */
  equiposReales?: EquipoRealParaPrompt[] | null
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'>
  userId: string
  proyectoId: string
  signal?: AbortSignal
}

const SYSTEM_POR_EDT: Record<EdtConAgrupacionIA, string> = {
  CON: SYSTEM_PROPUESTA_ZONAS_CON,
  PRO: SYSTEM_PROPUESTA_FAMILIAS_PRO,
  PLC: SYSTEM_PROPUESTA_INSTANCIAS_PLC,
  HMI: SYSTEM_PROPUESTA_INSTANCIAS_HMI,
}

function construirPromptUsuario(
  edtNombre: EdtConAgrupacionIA,
  tareas: TareaParaPrompt[],
  alcanceLibre: string,
  cotizacion: ContextoCotizacionParaPrompt | null,
  contextoInstancias: ContextoInstanciasParaPrompt | null,
  equiposReales: EquipoRealParaPrompt[] | null,
  notaCorrectiva: string
): string {
  switch (edtNombre) {
    case 'CON':
      return buildUserPropuestaZonasCon(tareas, alcanceLibre, cotizacion, notaCorrectiva)
    case 'PRO':
      return buildUserPropuestaFamiliasPro(tareas, alcanceLibre, cotizacion, equiposReales, notaCorrectiva)
    case 'PLC':
      return buildUserPropuestaInstanciasPlc(tareas, alcanceLibre, cotizacion, contextoInstancias, notaCorrectiva)
    case 'HMI':
      return buildUserPropuestaInstanciasHmi(tareas, alcanceLibre, cotizacion, contextoInstancias, notaCorrectiva)
  }
}

/**
 * Propone agrupación vía IA (zonas CON / familias PRO / instancias de
 * controlador PLC / estaciones HMI), con reintento único si la IA inventa
 * ids, y fallback determinista ("Sin agrupar") si tras el reintento sigue
 * habiendo tareas sin asignar — nunca lanza, nunca pierde una tarea. Mismo
 * espíritu que generarAlcanceDetallado.ts de Plan de Trabajo.
 */
export async function generarPropuestaConIA(opciones: GenerarPropuestaOpciones): Promise<ResultadoValidacionGrupos> {
  const {
    edtNombre,
    serviciosPermitidos,
    alcanceLibre,
    cotizacion,
    contextoInstancias = null,
    equiposReales = null,
    config,
    userId,
    proyectoId,
    signal,
  } = opciones

  if (serviciosPermitidos.length === 0) {
    return { actividades: [], tareaIdsNoAsignadas: [], tareaIdsInventados: [], advertencias: [] }
  }

  const tareasParaPrompt: TareaParaPrompt[] = serviciosPermitidos.map(s => ({
    id: s.id,
    nombre: s.nombre,
    descripcion: s.descripcion,
  }))

  const system = SYSTEM_POR_EDT[edtNombre]

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let notaCorrectiva = ''
  let resultado: ResultadoValidacionGrupos = { actividades: [], tareaIdsNoAsignadas: [], tareaIdsInventados: [], advertencias: [] }

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const inicio = Date.now()
    let response: Anthropic.Message
    try {
      response = await anthropic.messages.create(
        {
          model: MODELS.sonnet,
          max_tokens: 4096,
          system,
          messages: [
            {
              role: 'user',
              content: construirPromptUsuario(edtNombre, tareasParaPrompt, alcanceLibre, cotizacion, contextoInstancias, equiposReales, notaCorrectiva),
            },
          ],
        },
        { signal }
      )
    } catch (e) {
      resultado = validarPropuestaGrupos([], serviciosPermitidos, config, edtNombre)
      resultado.advertencias.push(`${edtNombre}: error llamando a la IA (${e instanceof Error ? e.message : 'desconocido'}) — se usó agrupación "Sin agrupar".`)
      return resultado
    }

    trackUsage({
      userId,
      tipo: `cronograma-planificacion.grupos-${edtNombre.toLowerCase()}`,
      modelo: MODELS.sonnet,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId, edtNombre, intento },
    })

    if (response.stop_reason === 'max_tokens') {
      notaCorrectiva = '\n\nTu respuesta anterior se truncó por exceder el límite de tokens. Agrupá en menos grupos o sé más breve en los nombres.'
      continue
    }

    let grupos: GrupoPropuestoIA[] = []
    try {
      const parsed = parseJsonIA(extraerTexto(response)) as { grupos?: GrupoPropuestoIA[] }
      grupos = parsed.grupos ?? []
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
      continue
    }

    resultado = validarPropuestaGrupos(grupos, serviciosPermitidos, config, edtNombre)

    if (resultado.tareaIdsInventados.length === 0) {
      return resultado
    }

    notaCorrectiva = `\n\nTu respuesta anterior incluía ids que NO existen en la lista de tareas candidatas: ${JSON.stringify(resultado.tareaIdsInventados)}. Usá SOLO los ids que aparecen en la lista de tareas candidatas del input, copiados tal cual.`
  }

  return resultado
}
