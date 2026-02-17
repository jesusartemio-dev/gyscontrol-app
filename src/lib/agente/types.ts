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
}

// Eventos SSE que el frontend recibe
export type SSEEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'error'
  | 'done'

export interface SSEEvent {
  type: SSEEventType
  data: string | ToolCallInfo | { error: string }
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
}

export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolContext
) => Promise<unknown>

export type ToolHandlerMap = Record<string, ToolHandler>

// ── Configuración ─────────────────────────────────────────

export const AGENT_MODEL = process.env.AI_CHAT_MODEL || 'claude-sonnet-4-5-20250929'
export const AGENT_MAX_TOKENS = 4096
export const AGENT_MAX_TOOL_ROUNDS = 10
