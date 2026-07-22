import Anthropic from '@anthropic-ai/sdk'
import { jsonrepair } from 'jsonrepair'
import { prisma } from '@/lib/prisma'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'
import { cargarContextoPets, type ActividadIpercAgrupada } from './cargarContexto'
import { adquirirLockPets, liberarLockPets } from './mutex'
import {
  RELLENAR_ETAPA_PETS_SYSTEM,
  buildRellenarEtapaUserPrompt,
} from './prompts/rellenarEtapaPets'
import { petsContenidoSchema } from '@/lib/validators/pets'
import type { BloqueComo } from '@/lib/validators/pets'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EventoRegenSSE =
  | { tipo: 'inicio'; alcance: 'etapa' | 'paso'; etapaIndex: number; pasoIndex?: number }
  | { tipo: 'progreso'; mensaje: string }
  | { tipo: 'guardado' }
  | { tipo: 'fin' }
  | { tipo: 'error'; mensaje: string }

// ─── Cliente Anthropic ────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function actividadesParaEtapa(
  etapaIdx: number,
  numEtapas: number,
  actividades: ActividadIpercAgrupada[],
): ActividadIpercAgrupada[] {
  if (actividades.length === 0 || numEtapas === 0) return []
  if (numEtapas <= 2) return actividades
  // Primera y última etapa (precauciones / cierre) reciben todos los peligros
  if (etapaIdx === 0 || etapaIdx === numEtapas - 1) return actividades
  const midCount = numEtapas - 2
  const sliceSize = Math.max(1, Math.ceil(actividades.length / midCount))
  const midIdx = etapaIdx - 1
  return actividades.slice(midIdx * sliceSize, midIdx * sliceSize + sliceSize)
}

// ─────────────────────────────────────────────────────────────────────────────
// REGENERAR ETAPA ENTERA
// ─────────────────────────────────────────────────────────────────────────────

export async function* regenerarEtapaPets(
  proyectoId: string,
  etapaIndex: number,
  userId: string,
): AsyncGenerator<EventoRegenSSE, void, void> {
  yield { tipo: 'inicio', alcance: 'etapa', etapaIndex }
  yield { tipo: 'progreso', mensaje: 'Cargando contexto...' }

  const ctx = await cargarContextoPets(proyectoId)
  if (!ctx) {
    yield { tipo: 'error', mensaje: 'Proyecto o PETS no encontrado' }
    return
  }

  const parsed = petsContenidoSchema.safeParse(ctx.pets.contenido)
  if (!parsed.success) {
    yield { tipo: 'error', mensaje: 'Contenido actual corrupto' }
    return
  }

  const etapaActual = parsed.data.procedimiento.etapas[etapaIndex]
  if (!etapaActual) {
    yield { tipo: 'error', mensaje: `Etapa ${etapaIndex} no existe` }
    return
  }

  if (!ctx.iperc) {
    yield { tipo: 'error', mensaje: 'El proyecto no tiene IPERC. No se puede regenerar.' }
    return
  }

  const lock = await adquirirLockPets(ctx.pets.id)
  if (!lock.ok) {
    yield { tipo: 'error', mensaje: 'Ya hay una generación en curso' }
    return
  }

  try {
    const letra = etapaActual.letra ?? String.fromCharCode(65 + etapaIndex)
    yield {
      tipo: 'progreso',
      mensaje: `Regenerando etapa ${letra}: ${etapaActual.titulo}...`,
    }

    const numEtapas = parsed.data.procedimiento.etapas.length
    const actividadesEtapa = actividadesParaEtapa(etapaIndex, numEtapas, ctx.iperc.actividadesAgrupadas)

    const peligrosRelevantes = actividadesEtapa.flatMap((a) => a.peligros).slice(0, 15)

    const userPrompt = buildRellenarEtapaUserPrompt({
      proyectoNombre: ctx.proyecto.nombre,
      etapaTitulo: etapaActual.titulo,
      etapaLetra: letra,
      pasos: etapaActual.pasos.map((p) => ({
        que: p.que,
        quien: p.quien.map((q) => q.rol),
      })),
      peligrosRelevantes,
      controlesIngenieria: actividadesEtapa.flatMap((a) => a.controlesIngenieria),
      controlesAdministrativos: actividadesEtapa.flatMap((a) => a.controlesAdministrativos),
      eppDisponibles: ctx.mpp?.eppPorCategoria ?? { basico: [], bioseguridad: [], especifico: [] },
      referenciasClienteDisponibles: ctx.iperc.referenciasCliente,
      alcanceTexto: ctx.plan?.alcanceDetalladoTexto || ctx.plan?.alcanceGeneral || '',
      mppRevisadoTexto: ctx.mpp?.revisadoTexto || '',
    })

    const modelo = getModelForTask('ssoma-document')
    const t0 = Date.now()

    const resp = await (anthropic.messages.create as (p: unknown) => Promise<Anthropic.Message>)({
      model: modelo,
      max_tokens: 8192,
      temperature: 0.3,
      system: [
        { type: 'text', text: RELLENAR_ETAPA_PETS_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    trackUsage({
      userId,
      tipo: `pets.regenerar.etapa.${letra}`,
      modelo,
      tokensInput: resp.usage.input_tokens,
      tokensOutput: resp.usage.output_tokens,
      tokensCacheCreation: resp.usage.cache_creation_input_tokens ?? 0,
      tokensCacheRead: resp.usage.cache_read_input_tokens ?? 0,
      duracionMs: Date.now() - t0,
    })

    const texto = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    type RespEtapa = { pasos?: Array<{ que: string; como: BloqueComo[]; quien?: Array<{ rol: string }> }> }
    const respuesta = parseJsonSafe<RespEtapa>(texto)

    if (!respuesta?.pasos?.length) {
      throw new Error('La IA no devolvió pasos válidos')
    }

    yield { tipo: 'progreso', mensaje: 'Aplicando cambios...' }

    const nuevoContenido = structuredClone(parsed.data)
    const etapaTarget = nuevoContenido.procedimiento.etapas[etapaIndex]

    const FALLBACK_COMO: BloqueComo[] = [{ tipo: 'parrafo', texto: '(contenido pendiente de generación)' }]

    etapaTarget.pasos = etapaActual.pasos.map((pasoOriginal, idx) => {
      const matchPorQue = respuesta.pasos!.find(
        (p) =>
          p.que === pasoOriginal.que ||
          p.que.trim().toLowerCase() === pasoOriginal.que.trim().toLowerCase(),
      )
      const matchPorPos = respuesta.pasos![idx]
      const match = matchPorQue ?? matchPorPos
      return {
        que: pasoOriginal.que,
        como: match?.como?.length ? match.como : FALLBACK_COMO,
        quien: pasoOriginal.quien,
      }
    })

    const final = petsContenidoSchema.safeParse(nuevoContenido)
    if (!final.success) {
      throw new Error(`Contenido regenerado inválido: ${JSON.stringify(final.error.issues.slice(0, 3))}`)
    }

    await prisma.pets.update({
      where: { id: ctx.pets.id },
      data: { contenido: final.data as object },
    })

    yield { tipo: 'guardado' }
    yield { tipo: 'fin' }
  } catch (e) {
    yield { tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) }
  } finally {
    await liberarLockPets(ctx.pets.id)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGENERAR UN PASO SOLO
// ─────────────────────────────────────────────────────────────────────────────

export async function* regenerarPasoPets(
  proyectoId: string,
  etapaIndex: number,
  pasoIndex: number,
  userId: string,
): AsyncGenerator<EventoRegenSSE, void, void> {
  yield { tipo: 'inicio', alcance: 'paso', etapaIndex, pasoIndex }
  yield { tipo: 'progreso', mensaje: 'Cargando contexto...' }

  const ctx = await cargarContextoPets(proyectoId)
  if (!ctx) {
    yield { tipo: 'error', mensaje: 'Proyecto o PETS no encontrado' }
    return
  }

  const parsed = petsContenidoSchema.safeParse(ctx.pets.contenido)
  if (!parsed.success) {
    yield { tipo: 'error', mensaje: 'Contenido actual corrupto' }
    return
  }

  const etapaActual = parsed.data.procedimiento.etapas[etapaIndex]
  if (!etapaActual) {
    yield { tipo: 'error', mensaje: `Etapa ${etapaIndex} no existe` }
    return
  }
  const pasoActual = etapaActual.pasos[pasoIndex]
  if (!pasoActual) {
    yield { tipo: 'error', mensaje: `Paso ${pasoIndex} no existe` }
    return
  }

  if (!ctx.iperc) {
    yield { tipo: 'error', mensaje: 'El proyecto no tiene IPERC' }
    return
  }

  const lock = await adquirirLockPets(ctx.pets.id)
  if (!lock.ok) {
    yield { tipo: 'error', mensaje: 'Ya hay una generación en curso' }
    return
  }

  try {
    yield { tipo: 'progreso', mensaje: `Regenerando paso: ${pasoActual.que}...` }

    const numEtapas = parsed.data.procedimiento.etapas.length
    const actividadesEtapa = actividadesParaEtapa(etapaIndex, numEtapas, ctx.iperc.actividadesAgrupadas)

    const letra = etapaActual.letra ?? String.fromCharCode(65 + etapaIndex)

    const userPrompt = buildRellenarEtapaUserPrompt({
      proyectoNombre: ctx.proyecto.nombre,
      etapaTitulo: etapaActual.titulo,
      etapaLetra: letra,
      pasos: [{ que: pasoActual.que, quien: pasoActual.quien.map((q) => q.rol) }],
      peligrosRelevantes: actividadesEtapa.flatMap((a) => a.peligros).slice(0, 15),
      controlesIngenieria: actividadesEtapa.flatMap((a) => a.controlesIngenieria),
      controlesAdministrativos: actividadesEtapa.flatMap((a) => a.controlesAdministrativos),
      eppDisponibles: ctx.mpp?.eppPorCategoria ?? { basico: [], bioseguridad: [], especifico: [] },
      referenciasClienteDisponibles: ctx.iperc.referenciasCliente,
      alcanceTexto: ctx.plan?.alcanceDetalladoTexto || ctx.plan?.alcanceGeneral || '',
      mppRevisadoTexto: ctx.mpp?.revisadoTexto || '',
    })

    // Pasos críticos usan Sonnet; el resto usa Haiku (más rápido y barato)
    const esCritico = /eléctric|eléctric|altura|atex|caliente|confinad|izaje/i.test(pasoActual.que)
    const modelo = esCritico ? getModelForTask('ssoma-document') : getModelForTask('ssoma-epp')
    const maxTokens = esCritico ? 4096 : 2048
    const t0 = Date.now()

    const resp = await (anthropic.messages.create as (p: unknown) => Promise<Anthropic.Message>)({
      model: modelo,
      max_tokens: maxTokens,
      temperature: 0.3,
      system: [
        { type: 'text', text: RELLENAR_ETAPA_PETS_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    trackUsage({
      userId,
      tipo: 'pets.regenerar.paso',
      modelo,
      tokensInput: resp.usage.input_tokens,
      tokensOutput: resp.usage.output_tokens,
      tokensCacheCreation: resp.usage.cache_creation_input_tokens ?? 0,
      tokensCacheRead: resp.usage.cache_read_input_tokens ?? 0,
      duracionMs: Date.now() - t0,
    })

    const texto = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    type RespPaso = { pasos?: Array<{ que: string; como: BloqueComo[] }> }
    const respuesta = parseJsonSafe<RespPaso>(texto)
    const nuevoComo = respuesta?.pasos?.[0]?.como

    if (!nuevoComo?.length) {
      throw new Error('La IA no devolvió contenido válido para el paso')
    }

    yield { tipo: 'progreso', mensaje: 'Aplicando cambios...' }

    const nuevoContenido = structuredClone(parsed.data)
    nuevoContenido.procedimiento.etapas[etapaIndex].pasos[pasoIndex] = {
      que: pasoActual.que,
      como: nuevoComo,
      quien: pasoActual.quien,
    }

    const final = petsContenidoSchema.safeParse(nuevoContenido)
    if (!final.success) {
      throw new Error(`Contenido regenerado inválido: ${JSON.stringify(final.error.issues.slice(0, 3))}`)
    }

    await prisma.pets.update({
      where: { id: ctx.pets.id },
      data: { contenido: final.data as object },
    })

    yield { tipo: 'guardado' }
    yield { tipo: 'fin' }
  } catch (e) {
    yield { tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) }
  } finally {
    await liberarLockPets(ctx.pets.id)
  }
}
