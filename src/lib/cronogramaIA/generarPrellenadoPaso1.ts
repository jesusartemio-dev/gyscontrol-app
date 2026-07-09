import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import { validarPrellenadoPaso1, type PrellenadoPaso1IA, type ResultadoValidacionPrellenado } from './validarPropuestasIA'
import { SYSTEM_PRELLENADO_PASO1, buildUserPrellenadoPaso1, type ContextoCotizacionParaPrompt, type EdtParaPrellenado } from './prompts'

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

const SUGERENCIA_VACIA: PrellenadoPaso1IA = {
  edtsSeleccionados: [],
  brownfield: false,
  ingenieriaDetalle: false,
  tableros: [],
  plcs: [],
  hmiCantidad: 0,
  scada: false,
}

interface GenerarPrellenadoOpciones {
  edtsCandidatos: EdtParaPrellenado[]
  cotizacion: ContextoCotizacionParaPrompt
  userId: string
  proyectoId: string
  signal?: AbortSignal
}

/**
 * Sugiere las respuestas del Paso 1 del wizard a partir de la cotización
 * real del proyecto — nunca lanza, nunca inventa un EDT (validado contra el
 * catálogo real). Sin retry: es una sugerencia editable, no una estructura
 * que deba cuadrar exacto.
 */
export async function generarPrellenadoPaso1(opciones: GenerarPrellenadoOpciones): Promise<ResultadoValidacionPrellenado> {
  const { edtsCandidatos, cotizacion, userId, proyectoId, signal } = opciones

  if (edtsCandidatos.length === 0) {
    return { sugerencia: SUGERENCIA_VACIA, advertencias: [] }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const edtsPermitidos = new Set(edtsCandidatos.map(e => e.id))

  let response: Anthropic.Message
  const inicio = Date.now()
  try {
    response = await anthropic.messages.create(
      {
        model: MODELS.sonnet,
        max_tokens: 2048,
        system: SYSTEM_PRELLENADO_PASO1,
        messages: [{ role: 'user', content: buildUserPrellenadoPaso1(edtsCandidatos, cotizacion) }],
      },
      { signal }
    )
  } catch (e) {
    return {
      sugerencia: SUGERENCIA_VACIA,
      advertencias: [`Error llamando a la IA para el pre-llenado (${e instanceof Error ? e.message : 'desconocido'}) — completa el Paso 1 manualmente.`],
    }
  }

  trackUsage({
    userId,
    tipo: 'cronograma-planificacion.prellenado-paso1',
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId },
  })

  let raw: Record<string, unknown> = {}
  try {
    raw = parseJsonIA(extraerTexto(response)) as Record<string, unknown>
  } catch {
    return { sugerencia: SUGERENCIA_VACIA, advertencias: ['La IA no devolvió un pre-llenado válido — completa el Paso 1 manualmente.'] }
  }

  return validarPrellenadoPaso1(raw, edtsPermitidos)
}
