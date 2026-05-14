import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { cargarContextoMpp } from './cargarContexto'
import { construirPromptAjustes, type AjusteMpp } from './prompts/generarAjustesMpp'
import { PUESTOS_MPP } from './catalogos/puestos'
import { trackUsage } from '@/lib/agente/usageTracker'

const MODEL_HAIKU = 'claude-haiku-4-5-20251001'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ResultadoGeneracionMpp {
  mppId: string
  itemsCreados: number
  ajustesAplicados: number
  ajustesIgnorados: number
  resumen: string
  modelo: string
  promptTokens?: number
  outputTokens?: number
}

const EVALUADORES_DEFAULT = [
  { nombre: 'Ing. Yony Apaza Arpasi', cargo: 'Supervisor SSOMA' },
  { nombre: 'Ing. Jesús Mamani Velásquez', cargo: 'Responsable SSOMA' },
  { nombre: 'Ing. Carlos Sihuayro Ancco', cargo: 'Especialista SSOMA' },
]

export async function* generarMppConIa(
  proyectoId: string,
  userId?: string,
): AsyncGenerator<object, ResultadoGeneracionMpp, unknown> {
  yield { type: 'inicio', mensaje: 'Cargando contexto del proyecto e IPERC...' }

  const contexto = await cargarContextoMpp(proyectoId)

  yield {
    type: 'contexto_cargado',
    totalFilasIperc: contexto.iperc.totalFilas,
    puestosAnalizados: contexto.iperc.resumenPorPuesto.length,
    factores: contexto.iperc.factoresGlobales,
  }

  // Conservar cabecera del MPP previo si existe, luego eliminarlo
  const mppPrevio = await prisma.mpp.findUnique({
    where: { proyectoId },
    select: {
      id: true,
      codigoDocumento: true,
      revision: true,
      area: true,
      gerencia: true,
      evaluadores: true,
      observaciones: true,
    },
  })

  if (mppPrevio) {
    yield { type: 'mpp_previo_eliminado', mppId: mppPrevio.id }
    await prisma.mpp.delete({ where: { id: mppPrevio.id } })
  }

  const codigoDoc = mppPrevio?.codigoDocumento ?? `${contexto.proyecto.codigo}-MPP-001`

  yield { type: 'llamando_modelo', modelo: MODEL_HAIKU }

  const prompt = construirPromptAjustes(contexto)

  let aiResponse: Anthropic.Messages.Message
  try {
    aiResponse = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    yield { type: 'error_ia', mensaje }
    throw error
  }

  const promptTokens = aiResponse.usage.input_tokens
  const outputTokens = aiResponse.usage.output_tokens

  if (userId) {
    trackUsage({
      userId,
      tipo: 'mpp.generar',
      modelo: MODEL_HAIKU,
      tokensInput: promptTokens,
      tokensOutput: outputTokens,
    })
  }

  yield { type: 'respuesta_recibida', promptTokens, outputTokens }

  const textoRespuesta = aiResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Respuesta IA sin JSON válido')
  }

  let parsed: { ajustes: AjusteMpp[]; resumen: string }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    throw new Error(`JSON inválido en respuesta IA: ${e}`)
  }

  const ajustesPropuestos: AjusteMpp[] = parsed.ajustes ?? []

  // Filtrar ajustes con puestos no estándar antes de aplicarlos
  const puestosValidos = new Set<string>(PUESTOS_MPP)
  const ajustesValidos = ajustesPropuestos.filter((ajuste) => {
    if (!puestosValidos.has(ajuste.puesto)) {
      console.warn(`[mpp ia] Puesto inválido "${ajuste.puesto}" en ajuste, ignorado`)
      return false
    }
    return true
  })
  const ajustesPuestosIgnorados = ajustesPropuestos.length - ajustesValidos.length

  yield {
    type: 'ajustes_recibidos',
    cantidad: ajustesPropuestos.length,
    validos: ajustesValidos.length,
    puestosIgnorados: ajustesPuestosIgnorados,
    resumen: parsed.resumen,
  }

  // Cargar catálogo completo para crear los MppItems
  const catalogo = await prisma.mppEppCatalogo.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' },
  })

  const nombresEppValidos = new Set(catalogo.map((c) => c.nombre))

  // Clasificar ajustes por EPP válido
  let aplicados = 0
  let ignorados = ajustesPuestosIgnorados
  for (const ajuste of ajustesValidos) {
    if (nombresEppValidos.has(ajuste.eppNombre)) {
      aplicados++
    } else {
      ignorados++
      console.warn(`[mpp ia] EPP "${ajuste.eppNombre}" no encontrado en catálogo, ignorado`)
    }
  }

  // Crear nuevo MPP dentro de una transacción
  const mppNuevo = await prisma.$transaction(async (tx) => {
    const created = await tx.mpp.create({
      data: {
        proyectoId,
        codigoDocumento: codigoDoc,
        revision: mppPrevio?.revision ?? '01',
        area: mppPrevio?.area ?? contexto.proyecto.nombre,
        gerencia: mppPrevio?.gerencia ?? 'PROYECTOS',
        evaluadores: (mppPrevio?.evaluadores as object) ?? EVALUADORES_DEFAULT,
        observaciones: mppPrevio?.observaciones ?? '',
        estado: 'borrador',
      },
    })

    for (const epp of catalogo) {
      const defaults = epp.asignacionesDefault as string[]

      // Inicializar las 10 keys fijas (false por defecto)
      const asignaciones: Record<string, boolean> = {}
      for (const puesto of PUESTOS_MPP) {
        asignaciones[puesto] = false
      }
      // Activar los defaults válidos
      for (const puesto of defaults) {
        if (puestosValidos.has(puesto)) {
          asignaciones[puesto] = true
        }
      }
      // Aplicar ajustes IA ya filtrados (solo puestos estándar)
      for (const ajuste of ajustesValidos) {
        if (ajuste.eppNombre === epp.nombre && nombresEppValidos.has(ajuste.eppNombre)) {
          asignaciones[ajuste.puesto] = ajuste.accion === 'agregar'
        }
      }

      await tx.mppItem.create({
        data: {
          mppId: created.id,
          mppEppCatalogoId: epp.id,
          asignaciones,
          orden: epp.orden,
        },
      })
    }

    return created
  })

  yield {
    type: 'mpp_creado',
    mppId: mppNuevo.id,
    itemsCreados: catalogo.length,
    ajustesAplicados: aplicados,
    ajustesIgnorados: ignorados,
  }

  return {
    mppId: mppNuevo.id,
    itemsCreados: catalogo.length,
    ajustesAplicados: aplicados,
    ajustesIgnorados: ignorados,
    resumen: parsed.resumen,
    modelo: MODEL_HAIKU,
    promptTokens,
    outputTokens,
  }
}
