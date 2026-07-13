import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from '@/lib/planTrabajo/parseJsonIA'
import {
  MAX_REINTENTOS,
  validarAsignacionEsquema,
  validarTareasNuevasPropuestas,
  type AsignacionPropuestaIA,
  type ResultadoValidacionGrupos,
  type TareaNuevaPropuestaIA,
} from './validarPropuestasIA'
import type { CatalogoParaMatch } from './matchTareaCatalogo'
import {
  SYSTEM_ASIGNACION_CON,
  SYSTEM_ASIGNACION_PRO,
  buildUserAsignacionCon,
  buildUserAsignacionPro,
  type ContextoCotizacionParaPrompt,
  type EquipoRealParaPrompt,
  type TareaParaPrompt,
} from './prompts'
import type { CatalogoServicioParaWizard, ConfiguracionWizardPaso1, NombreConAlias } from '@/types/cronogramaIA'

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

type EdtConEsquema = 'CON' | 'PRO'

interface GenerarAsignacionOpciones {
  edtNombre: EdtConEsquema
  nombresActividades: NombreConAlias[]
  serviciosPermitidos: CatalogoServicioParaWizard[]
  /** TODO el catálogo real (no solo serviciosPermitidos, filtrado por EDT) — usado por el anti-duplicado de tareasNuevasPropuestas, que puede calzar con un servicio de OTRO EDT. */
  catalogoCompleto: CatalogoParaMatch[]
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
    catalogoCompleto,
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
  const nombresPlano = nombresActividades.map(n => n.nombre)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let notaCorrectiva = ''
  let resultado: ResultadoValidacionGrupos = { actividades: [], tareaIdsNoAsignadas: [], tareaIdsInventados: [], advertencias: [] }
  let tareasNuevasCrudas: TareaNuevaPropuestaIA[] = []

  // Las tareas nuevas propuestas se validan (anti-duplicado + límite) recién
  // sobre el resultado FINAL que se va a devolver — nunca sobre un intento
  // descartado por reintento de ids inventados.
  function conTareasNuevas(r: ResultadoValidacionGrupos): ResultadoValidacionGrupos {
    if (tareasNuevasCrudas.length === 0) return r
    const extra = validarTareasNuevasPropuestas(tareasNuevasCrudas, r.actividades, catalogoCompleto, edtNombre)
    return { ...r, actividades: extra.actividades, advertencias: [...r.advertencias, ...extra.advertencias] }
  }

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const userPrompt =
      edtNombre === 'CON'
        ? buildUserAsignacionCon(tareasParaPrompt, nombresPlano, alcanceLibre, cotizacion, notaCorrectiva)
        : buildUserAsignacionPro(tareasParaPrompt, nombresPlano, alcanceLibre, cotizacion, equiposReales, notaCorrectiva)

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
      return conTareasNuevas(resultado)
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
      const parsed = parseJsonIA(extraerTexto(response)) as {
        asignaciones?: AsignacionPropuestaIA[]
        tareasNuevasPropuestas?: unknown
      }
      asignaciones = parsed.asignaciones ?? []
      tareasNuevasCrudas = (Array.isArray(parsed.tareasNuevasPropuestas) ? parsed.tareasNuevasPropuestas : [])
        .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
        .map(t => ({
          actividadDestino: typeof t.actividadDestino === 'string' ? t.actividadDestino : '',
          nombre: typeof t.nombre === 'string' ? t.nombre : '',
          justificacion: typeof t.justificacion === 'string' ? t.justificacion : '',
        }))
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
      continue
    }

    resultado = validarAsignacionEsquema(asignaciones, nombresActividades, serviciosPermitidos, config, edtNombre)

    if (resultado.tareaIdsInventados.length === 0) {
      return conTareasNuevas(resultado)
    }

    notaCorrectiva = `\n\nTu respuesta anterior incluía ids que NO existen en la lista de tareas candidatas: ${JSON.stringify(resultado.tareaIdsInventados)}. Usá SOLO los ids que aparecen en la lista de tareas candidatas del input, copiados tal cual.`
  }

  return conTareasNuevas(resultado)
}
