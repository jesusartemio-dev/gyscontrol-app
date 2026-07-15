import Anthropic from '@anthropic-ai/sdk'
import { MODELS } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { parseJsonIA } from './parseJsonIA'
import { calcularEstructuraAlcanceDetallado } from './alcanceEstructura'
import {
  SYSTEM_RESUMEN_EDTS,
  buildUserResumenEdts,
  SYSTEM_DETALLE_EDT,
  buildUserDetalleEdt,
  type CatalogoImagenParaPrompt,
} from './prompts/alcanceDetallado'
import type { CronogramaContexto, PlanAlcanceDetalladoEdt, PlanAlcanceDetalladoTarea, PlanPersonal } from '@/types/planTrabajo'
import type { ResultadoCalculo } from './calcularDatos'

/**
 * Orquesta la generación de `alcanceDetallado` (Bloque 4, Tarea 1):
 * 1. El servidor arma la estructura completa (alcanceEstructura.ts) — sin IA.
 * 2. Una llamada batch (Haiku) redacta 1 oración para cada EDT 'resumido'.
 * 3. Una llamada individual (Sonnet) por EDT 'detallado' redacta su
 *    descripción y la de cada uno de sus subItems, con las tareas reales
 *    del cronograma como contexto.
 * 4. Se valida que la IA no haya agregado/quitado/renombrado IDs — si la
 *    estructura no matchea, reintenta 1 vez; si sigue sin matchear, se
 *    mergean solo las descripciones que sí coinciden por id y el resto
 *    recibe un texto de respaldo determinista (nunca queda vacío).
 */

const MAX_REINTENTOS = 1

export function descripcionFallbackEdt(faseNombre: string, edtNombre: string): string {
  return `${edtNombre} — actividades correspondientes a la fase de ${faseNombre}, ejecutadas según lo establecido en el cronograma de planificación del proyecto.`
}

export function descripcionFallbackSubItem(actividadNombre: string): string {
  return `${actividadNombre} — actividad ejecutada según lo establecido en el cronograma de planificación del proyecto, sin mayor detalle adicional disponible.`
}

/** Fallback de la viñeta de una tarea — el nombre de la tarea tal cual (Bloque 4.2, Tarea 4). */
export function textoFallbackTarea(nombreTarea: string): string {
  return nombreTarea
}

export interface ResultadoDetalladoEdt {
  edtDescripcion: string
  subItems: Map<string, string>
  /** subItemId -> (tareaId -> viñeta redactada) — Bloque 4.2, Tarea 4. */
  tareas: Map<string, Map<string, string>>
  /** subItemId -> fotoSugerida — Bloque 4.2, Tarea 5 (solo UI, nunca se exporta al docx). */
  fotosSugeridas: Map<string, string>
  /** subItemId -> (tareaId -> fotoSugerida) — Bloque 4.2 sesión 2, Tarea 2 (solo UI, nunca se exporta al docx). */
  tareasFotosSugeridas: Map<string, Map<string, string>>
  /** subItemId -> (tareaId -> catalogoImagenIds ya validados contra el catálogo activo, máx. 2) — Bloque 4.2 sesión 4. */
  tareasImagenesSugeridas: Map<string, Map<string, string[]>>
}

/** Sugerencia de imagen de catálogo por tarea, ya validada anti-alucinación (Bloque 4.2 sesión 4). */
export interface SugerenciaImagenIA {
  edtRef: string
  tareaRef: string
  catalogoImagenIds: string[]
}

/**
 * Mergea las descripciones redactadas por IA en la estructura ya resuelta por
 * el servidor — SOLO toca el campo `descripcion` de cada nodo (por id), nunca
 * numeración ni nombres. Pura y testeable: dado el mismo input, mismo output.
 * Regresión del bug auditado (addendum A): antes cada subItem heredaba la
 * descripción del EDT padre repetida N veces — acá cada subItem recibe SU
 * PROPIO valor del mapa (por actividadRefId), con fallback determinista propio
 * si la IA no lo devolvió, nunca el valor de otro nodo.
 */
export function mergearDescripcionesEnEstructura(
  estructura: PlanAlcanceDetalladoEdt[],
  resumidoMapa: Map<string, string>,
  detalladoResultados: (ResultadoDetalladoEdt | undefined)[]
): PlanAlcanceDetalladoEdt[] {
  // Nota: se usa `||` a propósito (no `??`) — un string vacío es tan "sin
  // descripción" como null/undefined, y debe caer al fallback determinista
  // igual que si la IA no hubiera devuelto nada para ese id.
  let cursorDetallado = 0
  return estructura.map(edt => {
    if (edt.tipoDetalle === 'resumido') {
      const descripcion = resumidoMapa.get(edt.edtRefId ?? '') || descripcionFallbackEdt(edt.faseNombre, edt.edtNombre)
      const subItems = edt.subItems?.map(s => ({
        ...s,
        descripcion: descripcionFallbackSubItem(s.actividadNombre),
      }))
      return { ...edt, descripcion, subItems }
    }

    const resultado = detalladoResultados[cursorDetallado]
    cursorDetallado++
    const subItems = edt.subItems?.map(s => {
      const tareasIa = resultado?.tareas.get(s.actividadRefId ?? '')
      const tareasFotosIa = resultado?.tareasFotosSugeridas.get(s.actividadRefId ?? '')
      return {
        ...s,
        descripcion: resultado?.subItems.get(s.actividadRefId ?? '') || descripcionFallbackSubItem(s.actividadNombre),
        tareas: (s.tareas ?? []).map(t => ({
          ...t,
          texto: tareasIa?.get(t.tareaRefId ?? '') || textoFallbackTarea(t.nombre),
          fotoSugerida: tareasFotosIa?.get(t.tareaRefId ?? '') || '',
        })),
        fotoSugerida: resultado?.fotosSugeridas.get(s.actividadRefId ?? '') || '',
      }
    })
    return {
      ...edt,
      descripcion: resultado?.edtDescripcion || descripcionFallbackEdt(edt.faseNombre, edt.edtNombre),
      subItems,
    }
  })
}

/**
 * Preserva el estado manual del usuario (tareas excluidas del plan + su orden
 * personalizado, Bloque 4.2 sesión 3; rechazos de sugerencias de imagen por
 * IA, Bloque 4.2 sesión 4) a través de una regeneración —
 * `calcularEstructuraAlcanceDetallado` reconstruye toda la estructura desde el
 * cronograma real en su orden natural, sin saber nada de estos ajustes. Acá
 * se matchea por `tareaRefId` contra el estado ANTERIOR del plan (antes de
 * sobrescribirlo): una tarea marcada `excluida` sigue excluida, sus
 * `catalogoImagenesRechazadas` se conservan, y el orden relativo del usuario
 * se reaplica. Una tarea nueva en el cronograma (no existía en el estado
 * anterior) se agrega al final, en su orden natural.
 * Pura y testeable: no decide nada por IA, solo reconcilia dos estructuras.
 */
export function preservarEstadoManualTareas(
  estructuraNueva: PlanAlcanceDetalladoEdt[],
  estructuraAnterior: PlanAlcanceDetalladoEdt[]
): PlanAlcanceDetalladoEdt[] {
  const tareasAnterioresPorSubItem = new Map<string, PlanAlcanceDetalladoTarea[]>()
  for (const edt of estructuraAnterior) {
    for (const s of edt.subItems ?? []) {
      if (s.actividadRefId) tareasAnterioresPorSubItem.set(s.actividadRefId, s.tareas ?? [])
    }
  }

  return estructuraNueva.map(edt => ({
    ...edt,
    subItems: (edt.subItems ?? []).map(s => {
      const anteriores = s.actividadRefId ? tareasAnterioresPorSubItem.get(s.actividadRefId) : undefined
      if (!anteriores || anteriores.length === 0) return s

      const ordenAnterior = new Map(anteriores.map((t, i) => [t.tareaRefId, i]))
      const excluidasPorId = new Map(anteriores.map(t => [t.tareaRefId, t.excluida ?? false]))
      const rechazadasPorId = new Map(anteriores.map(t => [t.tareaRefId, t.catalogoImagenesRechazadas ?? []]))

      const conExclusionYPosicion = (s.tareas ?? [])
        .map(t => ({
          ...t,
          excluida: t.tareaRefId ? (excluidasPorId.get(t.tareaRefId) ?? false) : false,
          catalogoImagenesRechazadas: t.tareaRefId ? (rechazadasPorId.get(t.tareaRefId) ?? []) : [],
        }))
        .map((t, i) => ({ t, i, pos: t.tareaRefId ? ordenAnterior.get(t.tareaRefId) : undefined }))

      conExclusionYPosicion.sort((a, b) => {
        if (a.pos !== undefined && b.pos !== undefined) return a.pos - b.pos
        if (a.pos !== undefined) return -1
        if (b.pos !== undefined) return 1
        return a.i - b.i // ambas nuevas — mantener el orden natural del cronograma
      })

      return { ...s, tareas: conExclusionYPosicion.map(({ t }) => t) }
    }),
  }))
}

function extraerTexto(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

// ─── Batch (Haiku) — EDTs 'resumido' ────────────────────────────────────────

async function generarDescripcionesResumido(
  edtsResumido: PlanAlcanceDetalladoEdt[],
  hechosEtapa1: string,
  userId: string,
  proyectoId: string,
  signal?: AbortSignal
): Promise<{ mapa: Map<string, string>; advertencias: string[] }> {
  const advertencias: string[] = []
  const candidatos = edtsResumido.filter(e => e.edtRefId)
  if (candidatos.length === 0) return { mapa: new Map(), advertencias }

  const idsEsperados = new Set(candidatos.map(e => e.edtRefId!))
  const payload = candidatos.map(e => ({ id: e.edtRefId!, edtNombre: e.edtNombre, faseNombre: e.faseNombre }))

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let notaCorrectiva = ''
  let ultimaRespuesta: { id: string; descripcion: string }[] = []

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const inicio = Date.now()
    const response = await anthropic.messages.create({
      model: MODELS.haiku,
      max_tokens: 8192,
      system: SYSTEM_RESUMEN_EDTS,
      messages: [{ role: 'user', content: buildUserResumenEdts(payload, hechosEtapa1, notaCorrectiva) }],
    }, { signal })

    trackUsage({
      userId,
      tipo: 'plan-trabajo.alcance.resumen-batch',
      modelo: MODELS.haiku,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId, intento },
    })

    if (response.stop_reason === 'max_tokens') {
      notaCorrectiva = '\n\nTu respuesta anterior se truncó por exceder el límite de tokens. Sé más breve en cada descripción.'
      continue
    }

    try {
      const parsed = parseJsonIA(extraerTexto(response)) as { descripciones?: { id: string; descripcion: string }[] }
      ultimaRespuesta = parsed.descripciones ?? []
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
      continue
    }

    const idsRecibidos = new Set(ultimaRespuesta.map(d => d.id))
    const coincide = idsRecibidos.size === idsEsperados.size && [...idsEsperados].every(id => idsRecibidos.has(id))
    if (coincide) {
      return { mapa: new Map(ultimaRespuesta.map(d => [d.id, d.descripcion])), advertencias }
    }
    notaCorrectiva = `\n\nTu respuesta anterior no tenía exactamente estos IDs. Devolvé EXACTAMENTE estos IDs, ni uno más ni uno menos:\n${JSON.stringify([...idsEsperados])}`
  }

  const mapa = new Map<string, string>()
  for (const d of ultimaRespuesta) if (idsEsperados.has(d.id)) mapa.set(d.id, d.descripcion)
  const faltantes = candidatos.filter(e => !mapa.has(e.edtRefId!))
  if (faltantes.length > 0) {
    advertencias.push(
      `La IA no devolvió descripción válida para ${faltantes.length} EDT(s) resumido(s) tras reintentar — se usó un texto genérico: ${faltantes.map(e => e.edtNombre).join(', ')}.`
    )
  }
  return { mapa, advertencias }
}

// ─── Individual (Sonnet) — un EDT 'detallado' por llamada ──────────────────

async function generarDescripcionesDetallado(
  edt: PlanAlcanceDetalladoEdt,
  tareasPorActividad: Map<string, { id: string; nombre: string; horasEstimadas: number | null; personasEstimadas: number }[]>,
  hechosEtapa1: string,
  catalogoImagenes: CatalogoImagenParaPrompt[],
  userId: string,
  proyectoId: string,
  signal?: AbortSignal
): Promise<{
  edtDescripcion: string
  subItems: Map<string, string>
  tareas: Map<string, Map<string, string>>
  fotosSugeridas: Map<string, string>
  tareasFotosSugeridas: Map<string, Map<string, string>>
  tareasImagenesSugeridas: Map<string, Map<string, string[]>>
  advertencias: string[]
}> {
  const advertencias: string[] = []
  const subItems = edt.subItems ?? []
  // Anti-alucinación (Bloque 4.2 sesión 4): la IA solo puede elegir de esta
  // lista cerrada — cualquier id que no exista acá se descarta y se loguea,
  // nunca se crea una imagen a partir de un id inventado.
  const idsCatalogoValidos = new Set(catalogoImagenes.map(c => c.id))
  function filtrarCatalogoImagenIds(ids: string[] | undefined, tareaId: string): string[] {
    if (!ids || ids.length === 0) return []
    const validos: string[] = []
    for (const id of ids) {
      if (idsCatalogoValidos.has(id)) {
        validos.push(id)
      } else {
        console.warn(
          `[generarAlcanceDetallado] catalogoImagenId inexistente "${id}" propuesto por la IA para la tarea ${tareaId} del EDT "${edt.edtNombre}" — descartado.`
        )
      }
    }
    return validos.slice(0, 2) // máximo 2 por tarea
  }
  const idsSubItemsEsperados = new Set(subItems.map(s => s.actividadRefId).filter((id): id is string => !!id))
  // subItemId -> Set(tareaId) esperados — misma validación estructural que los subItems (Tarea 4).
  const idsTareasEsperadasPorSubItem = new Map<string, Set<string>>(
    subItems
      .filter((s): s is typeof s & { actividadRefId: string } => !!s.actividadRefId)
      .map(s => [s.actividadRefId, new Set((s.tareas ?? []).map(t => t.tareaRefId).filter((id): id is string => !!id))])
  )

  const payload = {
    id: edt.edtRefId ?? edt.numeracion,
    edtNombre: edt.edtNombre,
    faseNombre: edt.faseNombre,
    subItems: subItems.map(s => ({
      id: s.actividadRefId ?? s.numeracion,
      actividadNombre: s.actividadNombre,
      tareas: tareasPorActividad.get(s.actividadRefId ?? '') ?? [],
    })),
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let notaCorrectiva = ''
  let tokensParaIntento = 4096
  let ultimaRespuesta: {
    id?: string
    edtDescripcion?: string
    subItems?: {
      id: string
      descripcion: string
      tareas?: { id: string; texto: string; fotoSugerida?: string; catalogoImagenIds?: string[] }[]
      fotoSugerida?: string
    }[]
  } = {}

  function validarTareasDeSubItems(subItemsRecibidos: NonNullable<typeof ultimaRespuesta.subItems>): boolean {
    return subItemsRecibidos.every(s => {
      const esperadas = idsTareasEsperadasPorSubItem.get(s.id)
      if (!esperadas) return true // subItem no reconocido — ya lo rechaza el chequeo de IDs de subItems
      const recibidas = new Set((s.tareas ?? []).map(t => t.id))
      return recibidas.size === esperadas.size && [...esperadas].every(id => recibidas.has(id))
    })
  }

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const inicio = Date.now()
    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: tokensParaIntento,
      system: SYSTEM_DETALLE_EDT,
      messages: [{ role: 'user', content: buildUserDetalleEdt(payload, hechosEtapa1, catalogoImagenes, notaCorrectiva) }],
    }, { signal })

    trackUsage({
      userId,
      tipo: 'plan-trabajo.alcance.detalle-edt',
      modelo: MODELS.sonnet,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      duracionMs: Date.now() - inicio,
      metadata: { proyectoId, edtId: payload.id, intento },
    })

    if (response.stop_reason === 'max_tokens') {
      tokensParaIntento = Math.min(tokensParaIntento * 2, 16000)
      notaCorrectiva = '\n\nTu respuesta anterior se truncó por exceder el límite de tokens. Sé más breve.'
      continue
    }

    try {
      ultimaRespuesta = parseJsonIA(extraerTexto(response)) as typeof ultimaRespuesta
    } catch {
      notaCorrectiva = '\n\nTu respuesta anterior no era JSON válido. Devolvé SOLO el JSON pedido, sin markdown.'
      continue
    }

    const subItemsRecibidos = ultimaRespuesta.subItems ?? []
    const idsRecibidos = new Set(subItemsRecibidos.map(s => s.id))
    const coincide =
      idsRecibidos.size === idsSubItemsEsperados.size &&
      [...idsSubItemsEsperados].every(id => idsRecibidos.has(id)) &&
      Boolean(ultimaRespuesta.edtDescripcion) &&
      validarTareasDeSubItems(subItemsRecibidos)

    if (coincide) {
      return {
        edtDescripcion: ultimaRespuesta.edtDescripcion!,
        subItems: new Map(subItemsRecibidos.map(s => [s.id, s.descripcion])),
        tareas: new Map(subItemsRecibidos.map(s => [s.id, new Map((s.tareas ?? []).map(t => [t.id, t.texto]))])),
        fotosSugeridas: new Map(subItemsRecibidos.map(s => [s.id, s.fotoSugerida ?? ''])),
        tareasFotosSugeridas: new Map(subItemsRecibidos.map(s => [s.id, new Map((s.tareas ?? []).map(t => [t.id, t.fotoSugerida ?? '']))])),
        tareasImagenesSugeridas: new Map(subItemsRecibidos.map(s => [s.id, new Map((s.tareas ?? []).map(t => [t.id, filtrarCatalogoImagenIds(t.catalogoImagenIds, t.id)]))])),
        advertencias,
      }
    }
    notaCorrectiva = `\n\nTu respuesta anterior no tenía exactamente estos IDs de subItems y/o de tareas dentro de cada subItem (o faltó "edtDescripcion"). Devolvé EXACTAMENTE estos IDs de subItems, ni uno más ni uno menos:\n${JSON.stringify([...idsSubItemsEsperados])}\ny, para cada subItem, EXACTAMENTE los IDs de "tareas" del input original (sin agregar, quitar ni reordenar).`
  }

  const mapaSubItems = new Map<string, string>()
  const mapaTareas = new Map<string, Map<string, string>>()
  const mapaFotosSugeridas = new Map<string, string>()
  const mapaTareasFotosSugeridas = new Map<string, Map<string, string>>()
  const mapaTareasImagenesSugeridas = new Map<string, Map<string, string[]>>()
  for (const s of ultimaRespuesta.subItems ?? []) {
    if (!idsSubItemsEsperados.has(s.id)) continue
    mapaSubItems.set(s.id, s.descripcion)
    const idsTareasEsperadas = idsTareasEsperadasPorSubItem.get(s.id) ?? new Set<string>()
    const tareasRecibidas = (s.tareas ?? []).filter(t => idsTareasEsperadas.has(t.id))
    mapaTareas.set(s.id, new Map(tareasRecibidas.map(t => [t.id, t.texto])))
    mapaTareasFotosSugeridas.set(s.id, new Map(tareasRecibidas.map(t => [t.id, t.fotoSugerida ?? ''])))
    mapaTareasImagenesSugeridas.set(s.id, new Map(tareasRecibidas.map(t => [t.id, filtrarCatalogoImagenIds(t.catalogoImagenIds, t.id)])))
    mapaFotosSugeridas.set(s.id, s.fotoSugerida ?? '')
  }
  const faltantes = subItems.filter(s => !mapaSubItems.has(s.actividadRefId ?? ''))
  if (faltantes.length > 0 || !ultimaRespuesta.edtDescripcion) {
    advertencias.push(
      `La IA no devolvió una estructura válida para el EDT "${edt.edtNombre}" tras reintentar — se usó texto genérico en ${faltantes.length} subItem(s)${!ultimaRespuesta.edtDescripcion ? ' y en la descripción del EDT' : ''}.`
    )
  }
  return {
    edtDescripcion: ultimaRespuesta.edtDescripcion ?? descripcionFallbackEdt(edt.faseNombre, edt.edtNombre),
    subItems: mapaSubItems,
    tareas: mapaTareas,
    fotosSugeridas: mapaFotosSugeridas,
    tareasFotosSugeridas: mapaTareasFotosSugeridas,
    tareasImagenesSugeridas: mapaTareasImagenesSugeridas,
    advertencias,
  }
}

// ─── Orquestador ────────────────────────────────────────────────────────────

export async function generarAlcanceDetallado(
  cron: NonNullable<CronogramaContexto> | null,
  personal: PlanPersonal[],
  hechosEtapa1: string,
  catalogoImagenes: CatalogoImagenParaPrompt[],
  userId: string,
  proyectoId: string,
  signal?: AbortSignal
): Promise<ResultadoCalculo<PlanAlcanceDetalladoEdt[]> & { sugerenciasImagenes: SugerenciaImagenIA[] }> {
  if (!cron) {
    return {
      data: [],
      advertencias: ['No hay cronograma de planificación — no se pudo generar el alcance detallado.'],
      sugerenciasImagenes: [],
    }
  }

  const { data: estructura, advertencias: advEstructura } = calcularEstructuraAlcanceDetallado(cron, personal)
  const advertencias = [...advEstructura]

  // Mapa actividadId -> tareas (para el contexto de los EDT 'detallado' — incluye
  // el id real de cada tarea para que la IA pueda referenciarlas por id, Tarea 4)
  const tareasPorActividad = new Map<string, { id: string; nombre: string; horasEstimadas: number | null; personasEstimadas: number }[]>()
  for (const fase of cron.fases) {
    for (const edt of fase.edts) {
      for (const act of edt.actividades) {
        tareasPorActividad.set(
          act.id,
          act.tareas.map(t => ({ id: t.id, nombre: t.nombre, horasEstimadas: t.horasEstimadas, personasEstimadas: t.personasEstimadas }))
        )
      }
    }
  }

  const edtsResumido = estructura.filter(e => e.tipoDetalle === 'resumido')
  const edtsDetallado = estructura.filter(e => e.tipoDetalle === 'detallado')

  const [resumidoResultado, ...detalladoResultados] = await Promise.all([
    generarDescripcionesResumido(edtsResumido, hechosEtapa1, userId, proyectoId, signal),
    ...edtsDetallado.map(edt =>
      generarDescripcionesDetallado(edt, tareasPorActividad, hechosEtapa1, catalogoImagenes, userId, proyectoId, signal)
    ),
  ])

  advertencias.push(...resumidoResultado.advertencias)
  for (const r of detalladoResultados) advertencias.push(...r.advertencias)

  const final = mergearDescripcionesEnEstructura(estructura, resumidoResultado.mapa, detalladoResultados)

  // Sugerencias de imagen por tarea (Bloque 4.2 sesión 4) — planas, listas
  // para que la ruta llamante las persista como PlanTrabajoImagen origen
  // IA_AUTO (ver aplicarSugerenciasImagenesIA.ts). Nunca se mergean en el
  // JSON de la estructura — las imágenes viven solo en su propia tabla.
  const sugerenciasImagenes: SugerenciaImagenIA[] = []
  edtsDetallado.forEach((edt, i) => {
    if (!edt.edtRefId) return
    const resultado = detalladoResultados[i]
    for (const s of edt.subItems ?? []) {
      const porTarea = resultado.tareasImagenesSugeridas.get(s.actividadRefId ?? '')
      if (!porTarea) continue
      for (const t of s.tareas ?? []) {
        const ids = t.tareaRefId ? porTarea.get(t.tareaRefId) : undefined
        if (ids && ids.length > 0) {
          sugerenciasImagenes.push({ edtRef: edt.edtRefId!, tareaRef: t.tareaRefId!, catalogoImagenIds: ids })
        }
      }
    }
  })

  return { data: final, advertencias, sugerenciasImagenes }
}
