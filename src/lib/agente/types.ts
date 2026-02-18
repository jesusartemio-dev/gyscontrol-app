// src/lib/agente/types.ts
// Tipos base para el Agente IA Comercial

import type Anthropic from '@anthropic-ai/sdk'

// ── Mensajes del chat ─────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface ChatAttachment {
  type: 'pdf'
  name: string
  base64: string
  mimeType: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  /** Tool calls ejecutados por el asistente en este turno */
  toolCalls?: ToolCallInfo[]
  /** Adjuntos enviados por el usuario */
  attachments?: ChatAttachment[]
}

// ── Tool calls ────────────────────────────────────────────

export interface ToolCallInfo {
  id: string
  name: string
  input: Record<string, unknown>
  result?: unknown
  status: 'running' | 'completed' | 'error'
}

// ── Request / Response del endpoint ───────────────────────

export interface ChatRequest {
  messages: ChatMessage[]
  /** Si el chat está en contexto de una cotización específica */
  cotizacionId?: string
  /** Conversación existente para continuar */
  conversacionId?: string
}

// Eventos SSE que el frontend recibe
export type SSEEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'error'
  | 'done'
  | 'conversation_info'
  | 'status'

/** Status phases emitted via SSE for UX feedback */
export type AgentStatusPhase =
  | 'analyzing_pdf'
  | 'executing_tools'
  | 'generating'
  | 'idle'

export interface SSEEvent {
  type: SSEEventType
  data: string | ToolCallInfo | { error: string }
}

// ── Conversaciones persistidas ───────────────────────────

export interface ConversacionListItem {
  id: string
  titulo: string | null
  cotizacionId: string | null
  updatedAt: string
  createdAt: string
  _count: { mensajes: number }
}

export interface ConversacionMensajeDB {
  id: string
  conversacionId: string
  role: MessageRole
  content: string
  attachments?: { name: string; type: string; mimeType: string }[] | null
  toolCalls?: ToolCallInfo[] | null
  createdAt: string
}

export interface ConversacionFull {
  id: string
  titulo: string | null
  cotizacionId: string | null
  createdAt: string
  updatedAt: string
  mensajes: ConversacionMensajeDB[]
}

/** Convierte un mensaje de DB al formato ChatMessage del frontend */
export function dbMessageToChatMessage(dbMsg: ConversacionMensajeDB): ChatMessage {
  // Defensive: Prisma Json? fields can return any JsonValue, not just the expected type
  let toolCalls: ToolCallInfo[] | undefined
  if (Array.isArray(dbMsg.toolCalls)) {
    toolCalls = (dbMsg.toolCalls as ToolCallInfo[]).map((tc) => ({
      id: tc.id || '',
      name: tc.name || '',
      input: tc.input || {},
      result: tc.result,
      status: tc.status || 'completed',
    }))
  }

  let attachments: ChatAttachment[] | undefined
  if (Array.isArray(dbMsg.attachments)) {
    attachments = (dbMsg.attachments as { name: string; type: string; mimeType: string }[]).map((a) => ({
      name: a.name || '',
      type: 'pdf' as const,
      mimeType: a.mimeType || 'application/pdf',
      base64: '', // Never stored in DB
    }))
  }

  return {
    id: dbMsg.id,
    role: dbMsg.role,
    content: dbMsg.content || '',
    timestamp: new Date(dbMsg.createdAt).getTime(),
    attachments,
    toolCalls,
  }
}

// ── Tipos de Claude API (re-exports útiles) ───────────────

export type AnthropicMessage = Anthropic.Messages.MessageParam
export type AnthropicTool = Anthropic.Messages.Tool
export type ContentBlock = Anthropic.Messages.ContentBlock
export type ToolUseBlock = Anthropic.Messages.ToolUseBlock
export type ToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam
export type TextBlock = Anthropic.Messages.TextBlock

// ── Tool handler ──────────────────────────────────────────

export interface ToolContext {
  userId: string
  /** cotizacionId from chat context — handlers MUST use this over Claude's input */
  cotizacionId?: string
}

export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolContext
) => Promise<unknown>

export type ToolHandlerMap = Record<string, ToolHandler>

// ── Configuración ─────────────────────────────────────────

export { getModelForTask } from './models'
export const AGENT_MAX_TOKENS = 4096
export const AGENT_MAX_TOOL_ROUNDS = 10
