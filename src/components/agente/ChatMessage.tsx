'use client'

import { memo, useMemo } from 'react'
import { Sparkles, User, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/lib/agente/types'
import { ToolCallIndicator } from './ToolCallIndicator'

interface Props {
  message: ChatMessageType
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

function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user'
  const timestamp = useMemo(() => timeAgo(message.timestamp), [message.timestamp])

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}

      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser ? 'items-end' : 'max-w-[90%]')}>
        {/* Attachments del usuario */}
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

        {/* Tool calls del asistente */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-1.5 w-full">
            {message.toolCalls.map((tc) => (
              <ToolCallIndicator key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Contenido del mensaje */}
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
            )}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className="prose-chat">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className={cn(
          'text-[10px] text-gray-400 mt-0.5 px-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {timestamp}
        </span>
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent)
