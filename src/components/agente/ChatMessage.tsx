'use client'

import { memo, useMemo } from 'react'
import { Sparkles, User, FileText, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/lib/agente/types'
import { ToolCallIndicator } from './ToolCallIndicator'

interface Props {
  message: ChatMessageType
}

/** Extract cotización code + ID from tool call results */
function extractCotizacionLink(msg: ChatMessageType): { code: string; id: string } | null {
  if (!msg.toolCalls) return null
  for (const tc of msg.toolCalls) {
    if (tc.name === 'crear_cotizacion' && tc.status === 'completed' && tc.result) {
      const r = tc.result as Record<string, unknown>
      if (r.id && r.codigo) return { id: String(r.id), code: String(r.codigo) }
    }
  }
  return null
}

/** Check if tool calls include a successful creation */
function getSuccessBanner(msg: ChatMessageType): string | null {
  if (!msg.toolCalls) return null
  for (const tc of msg.toolCalls) {
    if (tc.name === 'crear_cotizacion' && tc.status === 'completed' && tc.result) {
      const r = tc.result as Record<string, unknown>
      if (r.codigo) return `Cotización ${r.codigo} creada exitosamente`
    }
  }
  return null
}

/** Check if the message is only an error */
function isErrorOnly(text: string): boolean {
  return /^Error:\s*.+$/m.test(text) && text.replace(/^Error:\s*.+$/m, '').trim() === ''
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 10) return 'ahora'
  if (diff < 60) return `hace ${diff}s`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  return `hace ${hrs}h`
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white border border-[#e2e8f0] px-4 py-3 shadow-sm w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8] animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8] animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8] animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user'
  const timestamp = useMemo(() => timeAgo(message.timestamp), [message.timestamp])

  const successBanner = useMemo(
    () => !isUser ? getSuccessBanner(message) : null,
    [isUser, message]
  )

  const cotizacionLink = useMemo(
    () => !isUser ? extractCotizacionLink(message) : null,
    [isUser, message]
  )

  const errorOnly = !isUser && message.content ? isErrorOnly(message.content) : false
  const errorText = errorOnly ? message.content.replace(/^Error:\s*/m, '') : null
  const isStreaming = !isUser && !message.content && (!message.toolCalls || message.toolCalls.length === 0)

  return (
    <div
      className={cn(
        'flex gap-2.5 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-sm mt-0.5">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-sm mt-0.5">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end max-w-[80%]' : 'max-w-[85%]')}>
        {/* User attachments */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-0.5">
            {message.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-md bg-blue-500/80 px-2 py-0.5 text-[10px] text-white/90"
              >
                <FileText className="h-2.5 w-2.5" />
                <span className="max-w-[100px] truncate">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-1 w-full">
            {message.toolCalls.map((tc) => (
              <ToolCallIndicator key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Typing indicator for empty streaming messages */}
        {isStreaming && <TypingIndicator />}

        {/* Success banner */}
        {successBanner && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 w-full">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
            <span className="font-medium">{successBanner}</span>
          </div>
        )}

        {/* Error banner (replaces message content when error-only) */}
        {errorOnly && errorText && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 w-full">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#dc2626]" />
            <span>Algo salió mal. Intenta de nuevo.</span>
          </div>
        )}

        {/* Message content */}
        {message.content && !errorOnly && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
              isUser
                ? 'bg-[#2563eb] text-white rounded-tr-md'
                : 'bg-white border border-[#e2e8f0] text-[#1e293b] rounded-tl-md'
            )}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Cotización link button */}
        {cotizacionLink && (
          <a
            href={`/comercial/cotizaciones/${cotizacionLink.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8]"
          >
            Ver cotización {cotizacionLink.code}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Timestamp */}
        <span className={cn(
          'text-[10px] text-[#94a3b8] mt-0.5 px-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {timestamp}
        </span>
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent)
