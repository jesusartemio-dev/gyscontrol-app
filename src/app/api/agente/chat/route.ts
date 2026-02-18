// src/app/api/agente/chat/route.ts
// Endpoint SSE de chat con Claude API + tool_use loop

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/agente/systemPrompt'
import { selectToolsByContext } from '@/lib/agente/tools'
import { toolHandlers } from '@/lib/agente/toolHandlers'
import {
  getModelForTask,
  AGENT_MAX_TOKENS,
  AGENT_MAX_TOOL_ROUNDS,
} from '@/lib/agente/types'
import type { ChatRequest, ChatMessage, ToolContext, ToolCallInfo, ChatAttachment } from '@/lib/agente/types'
import { trackUsage, getCompanyMonthlyUsage } from '@/lib/agente/usageTracker'

// Allow up to 5 minutes for PDF analysis + multi-tool loops
export const maxDuration = 300

const MAX_HISTORY_MESSAGES = 10
const MAX_BODY_SIZE = 4 * 1024 * 1024 // 4MB safety limit before Vercel's 4.5MB
const AGENT_MAX_TOKENS_TDR = 8192 // Extended output for TDR/PDF analysis
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000] // Exponential backoff: 15s, 30s, 60s
const MAX_RETRIES = 3

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey })
}

/** Recorta el historial a los últimos N mensajes, preservando siempre el último (que es el actual) */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages
  return messages.slice(-MAX_HISTORY_MESSAGES)
}

/**
 * Estima páginas de un PDF a partir de su base64.
 * Cuenta ocurrencias del marcador "/Type /Page" (excluye "/Type /Pages").
 * Si el PDF está comprimido y no se puede parsear, devuelve 0 (desconocido).
 */
function estimatePdfPages(base64: string): number {
  try {
    const raw = atob(base64)
    // Count "/Type /Page" but not "/Type /Pages"
    const matches = raw.match(/\/Type\s*\/Page(?!s)/g)
    return matches ? matches.length : 0
  } catch {
    return 0
  }
}

/** Convierte ChatMessage[] del frontend al formato de la API de Anthropic */
function buildAnthropicMessages(
  messages: ChatMessage[]
): Anthropic.Messages.MessageParam[] {
  return messages
    .filter((m) => m.content.trim() || (m.attachments && m.attachments.length > 0))
    .map((m) => {
      // If user message has attachments, build multi-part content
      // Skip attachments with empty base64 (loaded from DB without file data)
      if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
        const contentParts: Anthropic.Messages.ContentBlockParam[] = []

        for (const att of m.attachments) {
          if (!att.base64) continue // Skip DB-loaded attachments (no base64 data)
          if (att.mimeType === 'application/pdf') {
            contentParts.push({
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: att.base64,
              },
            } as Anthropic.Messages.DocumentBlockParam)
          } else if (att.mimeType.startsWith('image/')) {
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: att.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: att.base64,
              },
            })
          }
        }

        // Only use multi-part format if we have actual attachment data
        if (contentParts.length > 0) {
          if (m.content.trim()) {
            contentParts.push({ type: 'text', text: m.content })
          }
          return { role: 'user' as const, content: contentParts }
        }
        // Fall through to plain text if all attachments were DB-loaded (no base64)
      }

      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }
    })
}

/** Escribe un evento SSE en el stream */
function writeSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  controller.enqueue(encoder.encode(payload))
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Anthropic.RateLimitError) return true
  if (err instanceof Error && err.message.includes('rate_limit')) return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Determina si el mensaje es simple (puede usar Haiku) o complejo (requiere Sonnet) */
function isSimpleMessage(messages: ChatMessage[]): boolean {
  const lastMsg = messages[messages.length - 1]
  if (!lastMsg) return true

  // Has attachments (PDF/image) → complex
  if (lastMsg.attachments && lastMsg.attachments.length > 0) return false

  const content = lastMsg.content.toLowerCase()
  const wordCount = content.split(/\s+/).filter(Boolean).length

  // Long messages → complex
  if (wordCount > 50) return false

  // Complex action keywords → Sonnet
  const complexKeywords = [
    'cotiza', 'crear cotización', 'nueva cotización', 'analiz', 'tdr',
    'términos de referencia', 'compara', 'evalúa', 'recomiend',
    'planifica', 'estructura', 'propuesta', 'cronograma',
    'desviación', 'desglose', 'detalle completo',
  ]
  if (complexKeywords.some((k) => content.includes(k))) return false

  // Previous assistant used tools → likely a follow-up needing same capability
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  if (lastAssistant?.toolCalls && lastAssistant.toolCalls.length > 2) return false

  return true
}

/** Comprime el resultado de un tool call para reducir tokens en el context */
const MAX_TOOL_RESULT_LENGTH = 3000
const MAX_TOOL_RESULT_ITEMS = 10

function compressToolResult(result: unknown): string {
  const json = JSON.stringify(result)

  // If already small, return as-is
  if (json.length <= MAX_TOOL_RESULT_LENGTH) return json

  // If it's an array, limit items
  if (Array.isArray(result)) {
    const truncated = result.slice(0, MAX_TOOL_RESULT_ITEMS)
    const compressed = JSON.stringify({
      items: truncated,
      _meta: { total: result.length, shown: truncated.length, truncated: true },
    })
    if (compressed.length <= MAX_TOOL_RESULT_LENGTH) return compressed
    // Still too large → hard truncate
    return compressed.substring(0, MAX_TOOL_RESULT_LENGTH) + '..."}'
  }

  // If it's an object with arrays, compress each array
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>
    const compressed: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val) && val.length > MAX_TOOL_RESULT_ITEMS) {
        compressed[key] = val.slice(0, MAX_TOOL_RESULT_ITEMS)
        compressed[`_${key}_total`] = val.length
      } else {
        compressed[key] = val
      }
    }
    const compressedJson = JSON.stringify(compressed)
    if (compressedJson.length <= MAX_TOOL_RESULT_LENGTH) return compressedJson
  }

  // Last resort: hard truncate
  return json.substring(0, MAX_TOOL_RESULT_LENGTH) + '...[truncated]'
}

/**
 * Pre-procesa un PDF adjunto: extrae un resumen estructurado con Haiku (barato)
 * para que el tool loop trabaje con texto liviano en vez del PDF completo.
 * Esto evita enviar el PDF N veces en cada round del tool loop.
 */
const PDF_EXTRACTION_PROMPT = `You are a document extraction assistant. Extract a comprehensive structured summary from this document.

Output the following sections (in Spanish):

## DATOS GENERALES
- Título/referencia del documento
- Cliente/entidad
- Fecha, código de referencia

## ALCANCE Y REQUERIMIENTOS TÉCNICOS
- Lista detallada de todos los requerimientos técnicos
- Sistemas solicitados (SCADA, PLC, instrumentación, etc.)
- Equipos mencionados con modelos/marcas si los hay
- Cantidades y especificaciones

## SERVICIOS SOLICITADOS
- Ingeniería, programación, comisionamiento, etc.
- Entregables documentales (planos, manuales, protocolos)

## CONDICIONES CONTRACTUALES
- Plazos de ejecución
- Garantías requeridas
- Penalidades
- Forma de pago

## REQUISITOS ESPECIALES
- Certificaciones, normas, estándares requeridos
- Condiciones de sitio (altura, zona clasificada, etc.)
- Personal requerido (certificaciones, experiencia mínima)

## INFORMACIÓN FALTANTE O AMBIGUA
- Puntos que no quedan claros
- Especificaciones faltantes
- Posibles contradicciones

Be thorough. Include ALL technical details, part numbers, specifications, and quantities mentioned in the document. This summary will be used to prepare a commercial quotation.`

async function preprocessPdfAttachment(
  client: Anthropic,
  base64: string,
  fileName: string,
  trackingCtx: { userId: string; conversacionId: string | null },
): Promise<string> {
  const model = getModelForTask('pdf-extraction') // Haiku
  const pages = estimatePdfPages(base64)

  console.info(`[chat:pdf-preprocess] Starting extraction: file="${fileName}" pages≈${pages} model=${model}`)
  const start = Date.now()

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          } as Anthropic.Messages.DocumentBlockParam,
          {
            type: 'text',
            text: PDF_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  })

  const elapsed = Date.now() - start
  const usage = response.usage
  console.info(
    `[chat:pdf-preprocess] Done: file="${fileName}" elapsed=${elapsed}ms ` +
    `input_tokens=${usage?.input_tokens ?? '?'} output_tokens=${usage?.output_tokens ?? '?'}`
  )

  // Track usage
  trackUsage({
    userId: trackingCtx.userId,
    tipo: 'pdf-preprocessing',
    modelo: model,
    tokensInput: usage?.input_tokens ?? 0,
    tokensOutput: usage?.output_tokens ?? 0,
    conversacionId: trackingCtx.conversacionId,
    duracionMs: elapsed,
    metadata: { fileName, pages },
  })

  // Extract text from response
  const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
  return textBlocks.map((b) => b.text).join('\n')
}

/**
 * Checks if the last message has PDF attachments and pre-processes them.
 * Returns modified messages where PDFs are replaced with text summaries.
 */
async function preprocessPdfMessages(
  client: Anthropic,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  trackingCtx: { userId: string; conversacionId: string | null },
): Promise<ChatMessage[]> {
  const lastMsg = messages[messages.length - 1]
  if (!lastMsg?.attachments?.some((a) => a.mimeType === 'application/pdf' && a.base64)) {
    return messages
  }

  const pdfAttachments = lastMsg.attachments.filter(
    (a) => a.mimeType === 'application/pdf' && a.base64
  )
  const nonPdfAttachments = lastMsg.attachments.filter(
    (a) => a.mimeType !== 'application/pdf' || !a.base64
  )

  if (pdfAttachments.length === 0) return messages

  // Notify frontend of PDF analysis phase
  writeSSE(controller, encoder, 'status', {
    phase: 'analyzing_pdf',
    detail: pdfAttachments.length === 1 ? pdfAttachments[0].name : `${pdfAttachments.length} documentos`,
  })

  // Notify user that we're analyzing the document
  writeSSE(controller, encoder, 'text_delta', {
    text: `📄 _Analizando ${pdfAttachments.length === 1 ? `"${pdfAttachments[0].name}"` : `${pdfAttachments.length} documentos`}..._\n\n`,
  })

  // Process each PDF
  const summaries: string[] = []
  for (const att of pdfAttachments) {
    try {
      const summary = await preprocessPdfAttachment(client, att.base64, att.name, trackingCtx)
      summaries.push(`--- DOCUMENTO: ${att.name} ---\n${summary}`)
    } catch (err) {
      console.error(`[chat:pdf-preprocess] Failed for "${att.name}":`, err)
      summaries.push(`--- DOCUMENTO: ${att.name} ---\n[Error al procesar: ${err instanceof Error ? err.message : 'desconocido'}]`)
    }
  }

  // Build modified message: replace PDFs with text summaries
  const summaryText = summaries.join('\n\n')
  const modifiedContent = lastMsg.content
    ? `${lastMsg.content}\n\n[Contenido extraído de documentos adjuntos:]\n${summaryText}`
    : `(documento adjunto)\n\n[Contenido extraído de documentos adjuntos:]\n${summaryText}`

  const modifiedMsg: ChatMessage = {
    ...lastMsg,
    content: modifiedContent,
    // Keep non-PDF attachments (images), remove PDFs (already extracted)
    attachments: nonPdfAttachments.length > 0 ? nonPdfAttachments as ChatAttachment[] : undefined,
  }

  return [...messages.slice(0, -1), modifiedMsg]
}

/** Determines if the request involves PDF/TDR analysis (needs more output tokens) */
function needsExtendedTokens(messages: ChatMessage[]): boolean {
  const lastMsg = messages[messages.length - 1]
  if (!lastMsg) return false
  // Has PDF attachments
  if (lastMsg.attachments?.some((a) => a.mimeType === 'application/pdf')) return true
  // TDR/analysis keywords
  const content = lastMsg.content.toLowerCase()
  const tdrKeywords = ['tdr', 'términos de referencia', 'analiz', 'documento', 'propuesta técnica']
  return tdrKeywords.some((k) => content.includes(k))
}

/** Genera título para la conversación a partir del primer mensaje */
function generateTitle(content: string, maxLen = 60): string {
  const cleaned = content.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLen) return cleaned
  const truncated = cleaned.substring(0, maxLen)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

/** Llama a Claude con exponential backoff en caso de rate limit */
async function callClaudeWithRetry(
  client: Anthropic,
  params: {
    model: string
    max_tokens: number
    system: string
    tools: Anthropic.Messages.Tool[]
    messages: Anthropic.Messages.MessageParam[]
  },
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  retryCtx: { notifiedUser: boolean } = { notifiedUser: false }
): Promise<Anthropic.Messages.Message> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (err) {
      lastError = err
      if (!isRateLimitError(err) || attempt === MAX_RETRIES) {
        throw err
      }

      // Show ONE friendly message on first retry only — no technical details
      if (!retryCtx.notifiedUser) {
        retryCtx.notifiedUser = true
        writeSSE(controller, encoder, 'status', {
          phase: 'generating',
          detail: 'rate_limit_wait',
        })
      }

      const delayMs = RETRY_DELAYS_MS[attempt] ?? 60_000
      console.info(`[chat] Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`)
      await sleep(delayMs)
    }
  }

  throw lastError
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Body size validation ──
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_SIZE) {
    console.info(`[chat] Request rejected: content-length=${contentLength} exceeds ${MAX_BODY_SIZE}`)
    return new Response(
      JSON.stringify({ error: `El archivo es demasiado grande. Máximo ${Math.round(MAX_BODY_SIZE / 1024 / 1024)}MB por request.` }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, cotizacionId, conversacionId: requestConversacionId } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Se requiere al menos un mensaje' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userId = (session.user as { id: string }).id
  const toolContext: ToolContext = { userId }

  // ── Monthly usage limit check (company-wide) ──
  try {
    const monthlyUsage = await getCompanyMonthlyUsage()
    if (monthlyUsage.costoTotal >= monthlyUsage.limiteMensual) {
      return new Response(
        JSON.stringify({
          error: 'Has alcanzado el límite de uso mensual del asistente. Contacta al administrador para más información.',
          limitReached: true,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    // Don't block chat if usage check fails — just log
    console.error('[chat] Failed to check monthly usage:', err)
  }

  const client = getClient()
  const systemPrompt = buildSystemPrompt({ cotizacionId })

  // Smart model selection: Haiku for simple messages, Sonnet for complex
  const simple = isSimpleMessage(messages)
  const model = getModelForTask(simple ? 'chat-simple' : 'chat')

  // Dynamic max_tokens: more output for TDR/PDF analysis
  const maxTokens = needsExtendedTokens(messages) ? AGENT_MAX_TOKENS_TDR : AGENT_MAX_TOKENS

  // Context-based tool filtering: only send relevant tools
  const lastUserContent = messages[messages.length - 1]?.content || ''
  const tools = selectToolsByContext(lastUserContent)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Resolve or create conversation ──
        let activeConversacionId = requestConversacionId || null
        if (!activeConversacionId) {
          const firstUserMsg = messages.find((m) => m.role === 'user')
          const titulo = generateTitle(firstUserMsg?.content || 'Nueva conversación')
          const conv = await prisma.agenteConversacion.create({
            data: { userId, titulo },
          })
          activeConversacionId = conv.id
          writeSSE(controller, encoder, 'conversation_info', {
            conversacionId: conv.id,
            titulo,
          })
        }

        // ── PDF preprocessing: extract summaries ONCE with Haiku ──
        // This replaces PDF base64 with text summaries so the tool loop
        // works with lightweight text instead of re-sending the PDF each round
        const processedMessages = await preprocessPdfMessages(
          client, messages, controller, encoder,
          { userId, conversacionId: activeConversacionId }
        )

        // Trim history to last N messages to reduce token usage
        const trimmedMessages = trimHistory(processedMessages)
        let anthropicMessages: Anthropic.Messages.MessageParam[] =
          buildAnthropicMessages(trimmedMessages)
        let toolRound = 0

        // Accumulate assistant response for persistence
        let accumulatedText = ''
        const accumulatedToolCalls: ToolCallInfo[] = []

        // Shared retry context across tool loop — only show rate limit message once
        const retryCtx = { notifiedUser: false }

        // Tool-use loop: Claude puede pedir tools, las ejecutamos y reenviamos
        while (toolRound < AGENT_MAX_TOOL_ROUNDS) {
          // Notify frontend we're generating
          writeSSE(controller, encoder, 'status', {
            phase: 'generating',
          })

          // Llamada a Claude con exponential backoff en rate limit
          const response = await callClaudeWithRetry(
            client,
            { model, max_tokens: maxTokens, system: systemPrompt, tools, messages: anthropicMessages },
            controller,
            encoder,
            retryCtx
          )

          // ── Usage logging + tracking ──
          const usage = response.usage
          console.info(
            `[chat] model=${model} round=${toolRound} ` +
            `input_tokens=${usage?.input_tokens ?? '?'} output_tokens=${usage?.output_tokens ?? '?'} ` +
            `tools=${tools.length} messages=${anthropicMessages.length} ` +
            `simple=${simple} maxTokens=${maxTokens}`
          )
          trackUsage({
            userId,
            tipo: simple ? 'chat-simple' : 'chat',
            modelo: model,
            tokensInput: usage?.input_tokens ?? 0,
            tokensOutput: usage?.output_tokens ?? 0,
            conversacionId: activeConversacionId,
            metadata: { round: toolRound, toolCount: tools.length },
          })

          // Procesar content blocks
          let hasToolUse = false
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type === 'text') {
              writeSSE(controller, encoder, 'text_delta', { text: block.text })
              accumulatedText += block.text
            } else if (block.type === 'tool_use') {
              hasToolUse = true
              const toolBlock = block as Anthropic.Messages.ToolUseBlock

              // Notify frontend of tool execution phase
              writeSSE(controller, encoder, 'status', {
                phase: 'executing_tools',
                detail: toolBlock.name,
              })

              // Notificar al frontend que una tool se está ejecutando
              writeSSE(controller, encoder, 'tool_call_start', {
                id: toolBlock.id,
                name: toolBlock.name,
                input: toolBlock.input,
              })

              // Ejecutar el handler
              let result: unknown
              let isError = false
              try {
                const handler = toolHandlers[toolBlock.name]
                if (!handler) {
                  throw new Error(`Tool no registrada: ${toolBlock.name}`)
                }
                result = await handler(toolBlock.input as Record<string, unknown>, toolContext)
              } catch (err) {
                isError = true
                result = { error: err instanceof Error ? err.message : 'Error desconocido' }
              }

              // Notificar al frontend que terminó
              writeSSE(controller, encoder, 'tool_call_end', {
                id: toolBlock.id,
                name: toolBlock.name,
                result,
                status: isError ? 'error' : 'completed',
              })

              accumulatedToolCalls.push({
                id: toolBlock.id,
                name: toolBlock.name,
                input: toolBlock.input as Record<string, unknown>,
                result,
                status: isError ? 'error' : 'completed',
              })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: isError ? JSON.stringify(result) : compressToolResult(result),
                is_error: isError,
              })
            }
          }

          // Si no hubo tool_use, terminamos el loop
          if (!hasToolUse) {
            break
          }

          // Si hubo tool_use, agregar la respuesta del asistente y los resultados,
          // y hacer otra iteración para que Claude procese los resultados
          anthropicMessages = [
            ...anthropicMessages,
            { role: 'assistant' as const, content: response.content },
            { role: 'user' as const, content: toolResults },
          ]
          toolRound++
        }

        // ── Persist messages to DB ──
        try {
          const currentUserMsg = messages[messages.length - 1]
          await prisma.$transaction([
            prisma.agenteConversacionMensaje.create({
              data: {
                conversacionId: activeConversacionId,
                role: 'user',
                content: currentUserMsg.content,
                attachments: currentUserMsg.attachments
                  ? currentUserMsg.attachments.map((a) => ({
                      name: a.name,
                      type: a.type,
                      mimeType: a.mimeType,
                    }))
                  : undefined,
              },
            }),
            prisma.agenteConversacionMensaje.create({
              data: {
                conversacionId: activeConversacionId,
                role: 'assistant',
                content: accumulatedText,
                toolCalls:
                  accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
              },
            }),
            prisma.agenteConversacion.update({
              where: { id: activeConversacionId },
              data: { updatedAt: new Date() },
            }),
          ])
        } catch (dbErr) {
          console.error('[chat] Failed to persist conversation:', dbErr)
        }

        // ── Check if approaching monthly limit and warn user ──
        try {
          const postUsage = await getCompanyMonthlyUsage()
          if (postUsage.porcentajeUsado >= 80 && postUsage.porcentajeUsado < 100) {
            writeSSE(controller, encoder, 'text_delta', {
              text: `\n\n---\n_ℹ️ Has usado el ${Math.round(postUsage.porcentajeUsado)}% del límite mensual del asistente ($${postUsage.costoTotal.toFixed(2)} de $${postUsage.limiteMensual})._`,
            })
          }
        } catch {
          // Non-critical — don't fail the response
        }

        writeSSE(controller, encoder, 'status', { phase: 'idle' })
        writeSSE(controller, encoder, 'done', {})
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error interno'
        writeSSE(controller, encoder, 'error', { error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
