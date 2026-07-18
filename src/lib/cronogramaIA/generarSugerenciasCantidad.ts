import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import { validarSugerenciasCantidad, type ResultadoValidacionCantidades, type SugerenciaCantidadIA } from './validarPropuestasIA'
import { SYSTEM_SUGERIR_CANTIDADES, buildUserSugerirCantidades, type ContextoCotizacionParaPrompt, type ServicioParaSugerirCantidad } from './prompts'
import { calcularHorasEstimadas } from './reglasActividades'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

interface GenerarSugerenciasCantidadOpciones {
  servicios: ServicioParaSugerirCantidad[]
  alcanceLibre: string
  cotizacion: ContextoCotizacionParaPrompt | null
  userId: string
  proyectoId: string
  signal?: AbortSignal
}

/**
 * Sugiere `cantidad` (best-effort, con IA) para servicios cuyo notaCantidad
 * NO matchea el mapeo determinístico (ver resolverCantidadDeterminista en
 * reglasActividades.ts) — ej. "metros de cable", que Paso 1 no captura como
 * número. Sin retry: es una sugerencia editable en el Paso 2, no una
 * estructura que deba cuadrar exacto. Nunca lanza, nunca inventa un id
 * (validado contra el catálogo real) — si la IA no encuentra evidencia
 * numérica en el texto, el servicio simplemente no aparece en el resultado y
 * el caller cae al default del catálogo (cantidad ?? 1).
 */
export async function generarSugerenciasCantidad(opciones: GenerarSugerenciasCantidadOpciones): Promise<ResultadoValidacionCantidades> {
  const { servicios, alcanceLibre, cotizacion, userId, proyectoId, signal } = opciones

  if (servicios.length === 0) {
    return { cantidades: new Map(), advertencias: [] }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const idsPermitidos = new Set(servicios.map(s => s.id))

  let response: Anthropic.Message
  const inicio = Date.now()
  try {
    response = await anthropic.messages.create(
      {
        model: MODELS.sonnet,
        max_tokens: 2048,
        system: SYSTEM_SUGERIR_CANTIDADES,
        messages: [{ role: 'user', content: buildUserSugerirCantidades(servicios, alcanceLibre, cotizacion) }],
      },
      { signal }
    )
  } catch (e) {
    return {
      cantidades: new Map(),
      advertencias: [`Error llamando a la IA para sugerir cantidades (${e instanceof Error ? e.message : 'desconocido'}) — completa las cantidades manualmente en el Paso 2.`],
    }
  }

  trackUsage({
    userId,
    tipo: 'cronograma-planificacion.sugerir-cantidades',
    modelo: MODELS.sonnet,
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    duracionMs: Date.now() - inicio,
    metadata: { proyectoId },
  })

  let sugerencias: SugerenciaCantidadIA[] = []
  try {
    const raw = parseJsonIA(extraerTexto(response)) as { sugerencias?: SugerenciaCantidadIA[] }
    sugerencias = Array.isArray(raw.sugerencias) ? raw.sugerencias : []
  } catch {
    return { cantidades: new Map(), advertencias: ['La IA no devolvió sugerencias de cantidad válidas — completa las cantidades manualmente en el Paso 2.'] }
  }

  return validarSugerenciasCantidad(sugerencias, idsPermitidos)
}

/**
 * Recorre `actividades` ya construidas (deterministas y/o agrupadas por IA,
 * da igual el origen — el único requisito es que sus tareas vengan de
 * `construirTareaPropuesta`, que ya deja `notaCantidad`/`cantidadSugeridaPorIA`
 * listos), le pide a la IA una cantidad SOLO para las tareas con
 * `notaCantidad` que el mapeo determinístico no pudo resolver
 * (`cantidadSugeridaPorIA` sigue false), y sobreescribe `cantidad`/
 * `horasEstimadas`/`cantidadSugeridaPorIA` en las que sí obtuvieron una
 * sugerencia válida. Las demás quedan exactamente como estaban — nunca
 * inventa una cantidad para un servicio sin `notaCantidad` ni pisa una ya
 * resuelta determinísticamente.
 */
export async function sugerirYAplicarCantidades(
  actividades: ActividadPropuesta[],
  opciones: Omit<GenerarSugerenciasCantidadOpciones, 'servicios'>
): Promise<{ actividades: ActividadPropuesta[]; advertencias: string[] }> {
  const candidatas = new Map<string, ServicioParaSugerirCantidad>()
  for (const actividad of actividades) {
    for (const tarea of actividad.tareas) {
      if (
        tarea.catalogoServicioId &&
        tarea.notaCantidad &&
        !tarea.cantidadSugeridaPorIA &&
        !candidatas.has(tarea.catalogoServicioId)
      ) {
        candidatas.set(tarea.catalogoServicioId, {
          id: tarea.catalogoServicioId,
          nombre: tarea.nombre,
          notaCantidad: tarea.notaCantidad,
          unidadNombre: tarea.unidadNombre ?? '',
        })
      }
    }
  }

  if (candidatas.size === 0) {
    return { actividades, advertencias: [] }
  }

  const { cantidades, advertencias } = await generarSugerenciasCantidad({
    ...opciones,
    servicios: Array.from(candidatas.values()),
  })

  if (cantidades.size === 0) {
    return { actividades, advertencias }
  }

  const actividadesActualizadas = actividades.map(actividad => ({
    ...actividad,
    tareas: actividad.tareas.map(tarea => {
      const nuevaCantidad = tarea.catalogoServicioId ? cantidades.get(tarea.catalogoServicioId) : undefined
      if (nuevaCantidad === undefined) return tarea
      return {
        ...tarea,
        cantidad: nuevaCantidad,
        horasEstimadas: calcularHorasEstimadas(tarea.horaBase, tarea.horaRepetido, nuevaCantidad, tarea.nivelDificultad),
        cantidadSugeridaPorIA: true,
      }
    }),
  }))

  return { actividades: actividadesActualizadas, advertencias }
}
