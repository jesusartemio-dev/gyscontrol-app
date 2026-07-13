import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import {
  SYSTEM_ESQUEMAS_ZONAS_CON,
  SYSTEM_ESQUEMAS_FAMILIAS_PRO,
  buildUserEsquemasZonasCon,
  buildUserEsquemasFamiliasPro,
  type ContextoCotizacionParaPrompt,
  type EquipoRealParaPrompt,
  type EsquemaPropuestoIA,
} from './prompts'
import { resolverAliasParaNombres } from './aliasActividad'
import type { EsquemaAgrupacionPropuesto } from '@/types/cronogramaIA'

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

type EdtConEsquema = 'CON' | 'PRO'

interface GenerarEsquemasOpciones {
  edtNombre: EdtConEsquema
  /** Si no hay tareas candidatas para este EDT, no tiene sentido proponer esquemas — mismo guard que Etapa B/el flujo de un paso. */
  tieneTareasCandidatas: boolean
  alcanceLibre: string
  cotizacion: ContextoCotizacionParaPrompt | null
  equiposReales?: EquipoRealParaPrompt[] | null
  userId: string
  proyectoId: string
  signal?: AbortSignal
}

export interface ResultadoEsquemasIA {
  esquemas: EsquemaAgrupacionPropuesto[]
  advertencias: string[]
}

const MAX_REINTENTOS_JSON = 1

/**
 * Etapa A del flujo de 2 etapas de CON/PRO: propone 2-3 esquemas
 * alternativos de agrupación (solo nombres + criterio, sin tareas/ids) —
 * llamada barata, sin el guardrail de membership de ids porque acá no hay
 * ningún id en juego. Reintenta 1 vez solo si la respuesta no es JSON
 * válido (mismo criterio que generarPropuestaConIA).
 */
export async function generarEsquemasConIA(opciones: GenerarEsquemasOpciones): Promise<ResultadoEsquemasIA> {
  const { edtNombre, tieneTareasCandidatas, alcanceLibre, cotizacion, equiposReales = null, userId, proyectoId, signal } = opciones

  if (!tieneTareasCandidatas) {
    return { esquemas: [], advertencias: [] }
  }

  const system = edtNombre === 'CON' ? SYSTEM_ESQUEMAS_ZONAS_CON : SYSTEM_ESQUEMAS_FAMILIAS_PRO
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let notaCorrectiva = ''
  for (let intento = 0; intento <= MAX_REINTENTOS_JSON; intento++) {
    const userPrompt =
      edtNombre === 'CON'
        ? buildUserEsquemasZonasCon(alcanceLibre, cotizacion, equiposReales)
        : buildUserEsquemasFamiliasPro(alcanceLibre, cotizacion, equiposReales)

    const inicio = Date.now()
    let response: Anthropic.Message
    try {
      response = await anthropic.messages.create(
        {
          model: MODELS.sonnet,
          max_tokens: 2048,
          system,
          messages: [{ role: 'user', content: userPrompt + notaCorrectiva }],
        },
        { signal }
      )
    } catch (e) {
      return { esquemas: [], advertencias: [`${edtNombre}: error llamando a la IA para proponer esquemas (${e instanceof Error ? e.message : 'desconocido'}).`] }
    }

    trackUsage({
      userId,
      tipo: `cronograma-planificacion.esquemas-${edtNombre.toLowerCase()}`,
      modelo: MODELS.sonnet,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId, edtNombre, intento },
    })

    if (response.stop_reason === 'max_tokens') {
      notaCorrectiva = '\n\nTu respuesta anterior se truncó por exceder el límite de tokens. Proponé menos esquemas o nombres más breves.'
      continue
    }

    try {
      const parsed = parseJsonIA(extraerTexto(response)) as { esquemas?: EsquemaPropuestoIA[] }
      const esquemas = (parsed.esquemas ?? [])
        .filter(e => e && typeof e.criterio === 'string' && Array.isArray(e.nombres) && e.nombres.length > 0)
        .map(e => {
          const nombresCrudos = (e.nombres as unknown[])
            .filter((n): n is { nombre?: unknown; alias?: unknown } => !!n && typeof n === 'object')
            .map(n => ({
              nombre: typeof n.nombre === 'string' ? n.nombre.trim() : '',
              aliasPropuesto: typeof n.alias === 'string' ? n.alias : undefined,
            }))
            .filter(n => n.nombre.length > 0)
          // El alias que propone la IA nunca se usa tal cual — se valida/deriva
          // acá para garantizar el invariante (una palabra, único) siempre.
          const aliasPorNombre = resolverAliasParaNombres(nombresCrudos)
          const nombres = nombresCrudos.map(n => ({ nombre: n.nombre, alias: aliasPorNombre.get(n.nombre)! }))
          return {
            criterio: e.criterio,
            nombres,
            ...(typeof e.nota === 'string' && e.nota.trim().length > 0 ? { nota: e.nota.trim() } : {}),
          }
        })
        .filter(e => e.nombres.length > 0)
      return { esquemas, advertencias: [] }
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
    }
  }

  return { esquemas: [], advertencias: [`${edtNombre}: la IA no devolvió esquemas válidos tras reintentar — no se generó ninguna propuesta.`] }
}
