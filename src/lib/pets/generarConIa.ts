import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import {
  cargarContextoPets,
  type ActividadIpercAgrupada,
  type ContextoPets,
} from './cargarContexto'
import { adquirirLockPets, liberarLockPets } from './mutex'
import {
  GENERAR_INDICE_PETS_SYSTEM,
  buildIndiceUserPrompt,
} from './prompts/generarIndicePets'
import {
  RELLENAR_ETAPA_PETS_SYSTEM,
  buildRellenarEtapaUserPrompt,
} from './prompts/rellenarEtapaPets'
import {
  RESTRICCIONES_PETS_SYSTEM,
  buildRestriccionesUserPrompt,
} from './prompts/restriccionesPets'
import type { PetsContenido, BloqueComo } from '@/lib/validators/pets'

// ─── Tipos internos ──────────────────────────────────────────────────────────

type PasoIndice = { que: string; quien: string[] }
type EtapaIndice = { titulo: string; pasos: PasoIndice[] }

type PasoContenido = {
  que: string
  como: BloqueComo[]
  quien: Array<{ rol: string }>
}
type EtapaContenido = { titulo: string; pasos: PasoContenido[] }

type PushFn = (event: EventoSSE) => void

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type EventoSSE =
  | { tipo: 'inicio' }
  | { tipo: 'progreso'; mensaje: string }
  | { tipo: 'indice'; etapas: Array<{ titulo: string; pasosCount: number }> }
  | { tipo: 'etapa_inicio'; etapaLetra: string; etapaTitulo: string }
  | { tipo: 'etapa_ok'; etapaLetra: string; etapaTitulo: string; pasosCount: number }
  | { tipo: 'restricciones'; count: number }
  | { tipo: 'guardado' }
  | { tipo: 'fin' }
  | { tipo: 'error'; mensaje: string }

// ─── Cliente Anthropic ────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Helpers ──────────────────────────────────────────────────────────────────

class Semaphore {
  private queue: Array<() => void> = []
  private running = 0

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++
      return
    }
    await new Promise<void>(resolve => this.queue.push(resolve))
    this.running++
  }

  release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) next()
  }
}

function parseJsonSafe<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    try {
      return JSON.parse(jsonrepair(cleaned)) as T
    } catch {
      return null
    }
  }
}

function repartirActividades(
  etapasTitulos: string[],
  actividades: ActividadIpercAgrupada[]
): ActividadIpercAgrupada[][] {
  const n = etapasTitulos.length
  if (actividades.length === 0 || n === 0) return etapasTitulos.map(() => [])
  if (n <= 2) return etapasTitulos.map(() => actividades)

  const midCount = n - 2
  const sliceSize = Math.max(1, Math.ceil(actividades.length / midCount))

  return etapasTitulos.map((_, idx) => {
    if (idx === 0 || idx === n - 1) return actividades
    const midIdx = idx - 1
    return actividades.slice(midIdx * sliceSize, midIdx * sliceSize + sliceSize)
  })
}

// ─── Helper: contenido parcial con placeholders ───────────────────────────────

function buildContenidoParcial(
  ctx: ContextoPets,
  etapasIndice: EtapaIndice[],
  etapasContenido: Array<EtapaContenido | null>,
  restricciones: Array<{ texto: string }>,
  personal: Array<{ rol: string }>
): PetsContenido {
  const PLACEHOLDER: BloqueComo[] = [{ tipo: 'parrafo', texto: '(generando...)' }]

  return {
    personal,
    epp: {
      basico: ctx.mpp?.eppPorCategoria.basico.map(n => ({ nombre: n })) ?? [],
      bioseguridad: ctx.mpp?.eppPorCategoria.bioseguridad.map(n => ({ nombre: n })) ?? [],
      especifico: ctx.mpp?.eppPorCategoria.especifico.map(n => ({ nombre: n })) ?? [],
      mppRef: ctx.mpp?.codigoDocumento ?? '',
    },
    recursos: { equipos: [], herramientas: [], materiales: [] },
    procedimiento: {
      etapas: etapasIndice.map((etapa, i) => ({
        letra: String.fromCharCode(65 + i),
        titulo: etapa.titulo,
        pasos: etapasContenido[i]
          ? etapasContenido[i]!.pasos.map((paso, j) => ({
              numero: j + 1,
              que: paso.que,
              como: paso.como,
              quien: paso.quien,
            }))
          : etapa.pasos.map((paso, j) => ({
              numero: j + 1,
              que: paso.que,
              como: PLACEHOLDER,
              quien: paso.quien.map(r => ({ rol: r })),
            })),
      })),
    },
    restricciones,
    cambios: [
      {
        fecha: format(new Date(), 'dd/MM/yyyy'),
        version: ctx.pets.revision ?? '01',
        descripcion: 'Generado automáticamente por IA',
      },
    ],
  }
}

// ─── Generadores de secciones ─────────────────────────────────────────────────

async function generarIndice(
  ctx: ContextoPets,
  userId: string,
  push: PushFn
): Promise<EtapaIndice[]> {
  push({ tipo: 'progreso', mensaje: 'Generando estructura de etapas...' })

  const t0 = Date.now()
  const model = getModelForTask('ssoma-document')

  const actividadesIperc =
    ctx.iperc?.actividadesAgrupadas.map(a => ({
      actividadKey: a.actividadKey,
      tareas: a.tareas,
      puestos: a.puestos,
    })) ?? []

  const puestosDisponibles =
    ctx.mpp?.puestos.length
      ? ctx.mpp.puestos
      : (ctx.iperc?.actividadesAgrupadas
          .flatMap(a => a.puestos)
          .filter((v, i, arr) => arr.indexOf(v) === i) ?? [])

  const userPrompt = buildIndiceUserPrompt({
    proyectoNombre: ctx.proyecto.nombre,
    alcance: ctx.plan?.alcanceGeneral ?? '',
    actividadesIperc,
    puestosDisponibles,
  })

  const resp = await (anthropic.messages.create as any)({
    model,
    max_tokens: 4096,
    temperature: 0.3,
    system: [{ type: 'text', text: GENERAR_INDICE_PETS_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  trackUsage({
    userId,
    tipo: 'pets.indice',
    modelo: model,
    tokensInput: resp.usage.input_tokens,
    tokensOutput: resp.usage.output_tokens,
    tokensCacheCreation: resp.usage.cache_creation_input_tokens,
    tokensCacheRead: resp.usage.cache_read_input_tokens,
    duracionMs: Date.now() - t0,
  })

  const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
  const parsed = parseJsonSafe<{ etapas: EtapaIndice[] }>(text)

  const etapas = parsed?.etapas?.filter(
    e => e.titulo && Array.isArray(e.pasos) && e.pasos.length > 0
  )

  if (!etapas?.length || etapas.length < 3) {
    throw new Error(`Índice inválido: ${etapas?.length ?? 0} etapas generadas`)
  }

  return etapas
}

async function generarEtapa(
  ctx: ContextoPets,
  etapa: EtapaIndice,
  letra: string,
  actividadesRelevantes: ActividadIpercAgrupada[],
  userId: string
): Promise<EtapaContenido> {
  const peligrosRelevantes = actividadesRelevantes.flatMap(a => a.peligros).slice(0, 15)
  const useSonnet = etapa.pasos.length > 4 || peligrosRelevantes.length > 6
  const model = useSonnet ? getModelForTask('ssoma-document') : getModelForTask('ssoma-epp')
  const maxTokens = useSonnet ? 8192 : 4096

  const t0 = Date.now()

  const userPrompt = buildRellenarEtapaUserPrompt({
    proyectoNombre: ctx.proyecto.nombre,
    etapaTitulo: etapa.titulo,
    etapaLetra: letra,
    pasos: etapa.pasos,
    peligrosRelevantes,
    controlesIngenieria: actividadesRelevantes.flatMap(a => a.controlesIngenieria),
    controlesAdministrativos: actividadesRelevantes.flatMap(a => a.controlesAdministrativos),
    eppDisponibles: ctx.mpp?.eppPorCategoria ?? { basico: [], bioseguridad: [], especifico: [] },
    referenciasClienteDisponibles: ctx.iperc?.referenciasCliente ?? [],
  })

  const resp = await (anthropic.messages.create as any)({
    model,
    max_tokens: maxTokens,
    temperature: 0.3,
    system: [{ type: 'text', text: RELLENAR_ETAPA_PETS_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  trackUsage({
    userId,
    tipo: `pets.etapa.${letra}`,
    modelo: model,
    tokensInput: resp.usage.input_tokens,
    tokensOutput: resp.usage.output_tokens,
    tokensCacheCreation: resp.usage.cache_creation_input_tokens,
    tokensCacheRead: resp.usage.cache_read_input_tokens,
    duracionMs: Date.now() - t0,
  })

  const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
  const parsed = parseJsonSafe<{ pasos: PasoContenido[] }>(text)

  const FALLBACK_COMO: BloqueComo[] = [
    { tipo: 'parrafo', texto: '(contenido pendiente de generación)' },
  ]

  const pasos: PasoContenido[] = etapa.pasos.map((pasoIdx, i) => {
    const parsedPaso = parsed?.pasos?.[i]
    const como =
      Array.isArray(parsedPaso?.como) && parsedPaso.como.length > 0
        ? (parsedPaso.como as BloqueComo[])
        : FALLBACK_COMO

    const quien =
      Array.isArray(parsedPaso?.quien) && parsedPaso.quien.length > 0
        ? parsedPaso.quien
        : pasoIdx.quien.map(r => ({ rol: r }))

    return { que: pasoIdx.que, como, quien }
  })

  return { titulo: etapa.titulo, pasos }
}

async function procesarEtapas(
  ctx: ContextoPets,
  etapas: EtapaIndice[],
  userId: string,
  push: PushFn,
  onEtapaCompletada?: (idx: number, contenido: EtapaContenido) => void
): Promise<EtapaContenido[]> {
  const sem = new Semaphore(3)
  const actividadesPorEtapa = repartirActividades(
    etapas.map(e => e.titulo),
    ctx.iperc?.actividadesAgrupadas ?? []
  )

  const FALLBACK_COMO: BloqueComo[] = [
    { tipo: 'parrafo', texto: '(generación fallida — completar manualmente)' },
  ]

  const tasks = etapas.map((etapa, idx) => {
    const letra = String.fromCharCode(65 + idx)

    return async (): Promise<{ idx: number; contenido: EtapaContenido }> => {
      await new Promise<void>(r => setTimeout(r, idx * 500))
      await sem.acquire()
      try {
        push({ tipo: 'etapa_inicio', etapaLetra: letra, etapaTitulo: etapa.titulo })
        const contenido = await generarEtapa(ctx, etapa, letra, actividadesPorEtapa[idx], userId)
        push({ tipo: 'etapa_ok', etapaLetra: letra, etapaTitulo: etapa.titulo, pasosCount: contenido.pasos.length })
        onEtapaCompletada?.(idx, contenido)
        return { idx, contenido }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        push({ tipo: 'progreso', mensaje: `Advertencia: etapa ${letra} con error parcial — ${msg}` })
        const fallback: EtapaContenido = {
          titulo: etapa.titulo,
          pasos: etapa.pasos.map(p => ({
            que: p.que,
            como: FALLBACK_COMO,
            quien: p.quien.map(r => ({ rol: r })),
          })),
        }
        return { idx, contenido: fallback }
      } finally {
        sem.release()
      }
    }
  })

  const results = await Promise.all(tasks.map(t => t()))
  results.sort((a, b) => a.idx - b.idx)
  return results.map(r => r.contenido)
}

async function generarRestricciones(
  ctx: ContextoPets,
  etapasTitulos: string[],
  userId: string,
  push: PushFn
): Promise<Array<{ texto: string }>> {
  push({ tipo: 'progreso', mensaje: 'Generando restricciones...' })

  const t0 = Date.now()
  const model = getModelForTask('ssoma-epp')

  const peligrosCriticos =
    ctx.iperc?.actividadesAgrupadas.flatMap(a => a.peligros).slice(0, 10) ?? []

  const userPrompt = buildRestriccionesUserPrompt({
    proyectoNombre: ctx.proyecto.nombre,
    alcance: ctx.plan?.alcanceGeneral ?? '',
    peligrosCriticos,
    etapasTitulos,
  })

  const resp = await (anthropic.messages.create as any)({
    model,
    max_tokens: 2048,
    temperature: 0.2,
    system: [{ type: 'text', text: RESTRICCIONES_PETS_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  trackUsage({
    userId,
    tipo: 'pets.restricciones',
    modelo: model,
    tokensInput: resp.usage.input_tokens,
    tokensOutput: resp.usage.output_tokens,
    tokensCacheCreation: resp.usage.cache_creation_input_tokens,
    tokensCacheRead: resp.usage.cache_read_input_tokens,
    duracionMs: Date.now() - t0,
  })

  const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
  const parsed = parseJsonSafe<{ restricciones: Array<{ texto: string }> }>(text)
  const items = parsed?.restricciones?.filter(r => r.texto?.length > 5).slice(0, 15)

  if (!items?.length) {
    return [{ texto: 'PROHIBIDO ejecutar trabajos sin la autorización del supervisor responsable.' }]
  }

  return items
}

// ─── Orquestador principal ────────────────────────────────────────────────────

async function doWork(
  proyectoId: string,
  userId: string,
  push: PushFn
): Promise<void> {
  push({ tipo: 'progreso', mensaje: 'Cargando contexto del proyecto...' })

  const ctx = await cargarContextoPets(proyectoId)
  if (!ctx) {
    push({ tipo: 'error', mensaje: 'Proyecto o PETS no encontrado' })
    return
  }

  const petsId = ctx.pets.id
  const lock = await adquirirLockPets(petsId)
  if (!lock.ok) {
    push({
      tipo: 'error',
      mensaje: `Generación en curso (expira ${lock.conflicto?.expiraEn.toLocaleTimeString('es-PE')})`,
    })
    return
  }

  try {
    // 1. Generar índice
    const etapas = await generarIndice(ctx, userId, push)
    push({ tipo: 'indice', etapas: etapas.map(e => ({ titulo: e.titulo, pasosCount: e.pasos.length })) })

    // 2. Personal (disponible desde el índice, no necesita IA)
    const puestosUniq =
      ctx.mpp?.puestos.length
        ? ctx.mpp.puestos
        : (ctx.iperc?.actividadesAgrupadas
            .flatMap(a => a.puestos)
            .filter((v, i, arr) => arr.indexOf(v) === i) ?? [])
    const personal =
      puestosUniq.length > 0
        ? puestosUniq.map(p => ({ rol: p }))
        : [{ rol: 'Supervisor de Proyecto' }]

    // 3. Estado mutable compartido para guardados incrementales
    const etapasContenido: Array<EtapaContenido | null> = new Array(etapas.length).fill(null)
    const restriccionesActuales: Array<{ texto: string }> = []

    const guardarParcial = () =>
      prisma.pets.update({
        where: { id: petsId },
        data: {
          contenido: buildContenidoParcial(
            ctx, etapas, etapasContenido, restriccionesActuales, personal
          ) as object,
        },
      })

    // 4. Guardar esqueleto inmediatamente (estructura completa con placeholders)
    push({ tipo: 'progreso', mensaje: 'Guardando estructura inicial...' })
    await guardarParcial()

    // 5. Cola de guardados secuencial (evita escrituras concurrentes)
    let saveChain = Promise.resolve<unknown>(null)
    const queueSave = () => {
      saveChain = saveChain.then(guardarParcial).catch(err => {
        console.error('⚠️ Error en guardado parcial PETS:', err)
      })
    }

    // 6. Etapas + restricciones en paralelo — cada etapa guarda al completar
    const [etapasResult, restricciones] = await Promise.all([
      procesarEtapas(ctx, etapas, userId, push, (idx, contenido) => {
        etapasContenido[idx] = contenido
        queueSave()
      }),
      generarRestricciones(ctx, etapas.map(e => e.titulo), userId, push).then(r => {
        restriccionesActuales.push(...r)
        queueSave()
        return r
      }),
    ])
    push({ tipo: 'restricciones', count: restricciones.length })

    // 7. Esperar a que terminen todos los guardados parciales encolados
    await saveChain

    // 8. Guardado final canónico con el contenido completo y limpio
    push({ tipo: 'progreso', mensaje: 'Guardando contenido final...' })
    const contenidoFinal: PetsContenido = {
      personal,
      epp: {
        basico: ctx.mpp?.eppPorCategoria.basico.map(n => ({ nombre: n })) ?? [],
        bioseguridad: ctx.mpp?.eppPorCategoria.bioseguridad.map(n => ({ nombre: n })) ?? [],
        especifico: ctx.mpp?.eppPorCategoria.especifico.map(n => ({ nombre: n })) ?? [],
        mppRef: ctx.mpp?.codigoDocumento ?? '',
      },
      recursos: { equipos: [], herramientas: [], materiales: [] },
      procedimiento: {
        etapas: etapasResult.map((etapa, i) => ({
          letra: String.fromCharCode(65 + i),
          titulo: etapa.titulo,
          pasos: etapa.pasos.map((paso, j) => ({
            numero: j + 1,
            que: paso.que,
            como: paso.como,
            quien: paso.quien,
          })),
        })),
      },
      restricciones,
      cambios: [
        {
          fecha: format(new Date(), 'dd/MM/yyyy'),
          version: ctx.pets.revision ?? '01',
          descripcion: 'Generado automáticamente por IA',
        },
      ],
    }
    await prisma.pets.update({
      where: { id: petsId },
      data: { contenido: contenidoFinal as object },
    })
    push({ tipo: 'guardado' })
  } finally {
    await liberarLockPets(petsId)
    push({ tipo: 'fin' })
  }
}

// ─── Generador exportado ──────────────────────────────────────────────────────

export async function* generarPetsConIa(
  proyectoId: string,
  userId = 'system'
): AsyncGenerator<EventoSSE> {
  const queue: EventoSSE[] = []
  let waitResolve: (() => void) | null = null
  let isDone = false

  function push(event: EventoSSE): void {
    queue.push(event)
    waitResolve?.()
    waitResolve = null
  }

  yield { tipo: 'inicio' }

  const work = doWork(proyectoId, userId, push)
    .catch(err => {
      push({ tipo: 'error', mensaje: err instanceof Error ? err.message : String(err) })
    })
    .finally(() => {
      isDone = true
      waitResolve?.()
      waitResolve = null
    })

  while (!isDone || queue.length > 0) {
    while (queue.length > 0) {
      yield queue.shift()!
    }
    if (!isDone) {
      await new Promise<void>(resolve => {
        waitResolve = resolve
      })
    }
  }

  await work
}
