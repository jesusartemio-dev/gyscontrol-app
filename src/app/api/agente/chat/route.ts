// src/app/api/agente/chat/route.ts
// Endpoint SSE de chat con Claude API + tool_use loop

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/agente/systemPrompt'
import { allTools } from '@/lib/agente/tools'
import { toolHandlers } from '@/lib/agente/toolHandlers'
import {
  getModelForTask,
  AGENT_MAX_TOKENS,
  AGENT_MAX_TOOL_ROUNDS,
} from '@/lib/agente/types'
import type { ChatRequest, ChatMessage, ToolContext, ToolCallInfo } from '@/lib/agente/types'

const MAX_HISTORY_MESSAGES = 10
const RETRY_DELAY_MS = 15_000
const MAX_RETRIES = 2

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
      if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
        const contentParts: Anthropic.Messages.ContentBlockParam[] = []

        for (const att of m.attachments) {
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

        if (m.content.trim()) {
          contentParts.push({ type: 'text', text: m.content })
        }

        return { role: 'user' as const, content: contentParts }
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

/** Genera título para la conversación a partir del primer mensaje */
function generateTitle(content: string, maxLen = 60): string {
  const cleaned = content.replace(/\n/g, ' ').trim()
  if (cleaned.length <= maxLen) return cleaned
  const truncated = cleaned.substring(0, maxLen)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

/** Llama a Claude con reintentos automáticos en caso de rate limit */
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
  encoder: TextEncoder
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

      // Notify user about retry
      const waitSecs = Math.round(RETRY_DELAY_MS / 1000)
      writeSSE(controller, encoder, 'text_delta', {
        text: `\n\n⏳ _Límite de velocidad alcanzado. Reintentando en ${waitSecs} segundos..._\n\n`,
      })

      await sleep(RETRY_DELAY_MS)
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

  const client = getClient()
  const systemPrompt = buildSystemPrompt({ cotizacionId })
  const tools = allTools
  const model = getModelForTask('chat')

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

        // Check for large PDFs in the last message and warn
        const lastMsg = messages[messages.length - 1]
        if (lastMsg?.attachments) {
          for (const att of lastMsg.attachments) {
            if (att.mimeType === 'application/pdf') {
              const pages = estimatePdfPages(att.base64)
              if (pages > 20) {
                writeSSE(controller, encoder, 'text_delta', {
                  text: `⚠️ _El PDF "${att.name}" tiene aproximadamente ${pages} páginas. Documentos muy grandes pueden causar demoras o errores. Considera subir solo las secciones relevantes del TDR._\n\n`,
                })
              }
            }
          }
        }

        // Trim history to last N messages to reduce token usage
        const trimmedMessages = trimHistory(messages)
        let anthropicMessages: Anthropic.Messages.MessageParam[] =
          buildAnthropicMessages(trimmedMessages)
        let toolRound = 0

        // Accumulate assistant response for persistence
        let accumulatedText = ''
        const accumulatedToolCalls: ToolCallInfo[] = []

        // Tool-use loop: Claude puede pedir tools, las ejecutamos y reenviamos
        while (toolRound < AGENT_MAX_TOOL_ROUNDS) {
          // Llamada a Claude con retry automático en rate limit
          const response = await callClaudeWithRetry(
            client,
            { model, max_tokens: AGENT_MAX_TOKENS, system: systemPrompt, tools, messages: anthropicMessages },
            controller,
            encoder
          )

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
                content: JSON.stringify(result),
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
