'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Sparkles, Trash2, Package, FileEdit, FileSearch, Search } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type {
  ChatMessage as ChatMessageType,
  ChatAttachment,
  ToolCallInfo,
} from '@/lib/agente/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUGGESTIONS = [
  { icon: Package, label: 'Buscar equipos en catálogo', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { icon: FileEdit, label: 'Crear nueva cotización', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { icon: FileSearch, label: 'Analizar un TDR', color: 'text-violet-600 bg-violet-50 border-violet-100' },
  { icon: Search, label: 'Buscar cotización anterior', color: 'text-amber-600 bg-amber-50 border-amber-100' },
]

export function ChatPanel({ open, onOpenChange }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Smooth auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  const handleSend = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      if (isStreaming) return

      const userMsg: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        attachments,
      }

      const assistantId = `assistant-${Date.now()}`
      const assistantMsg: ChatMessageType = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        toolCalls: [],
      }

      const updatedMessages = [...messages, userMsg]
      setMessages([...updatedMessages, assistantMsg])
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/agente/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
          throw new Error(err.error || `Error ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No se pudo leer la respuesta')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ') && currentEvent) {
              const data = JSON.parse(line.slice(6))
              processSSEEvent(currentEvent, data, assistantId)
              currentEvent = ''
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `Error: ${errorMsg}` }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [messages, isStreaming]
  )

  function processSSEEvent(event: string, data: unknown, assistantId: string) {
    const d = data as Record<string, unknown>

    switch (event) {
      case 'text_delta': {
        const text = d.text as string
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + text } : m
          )
        )
        break
      }
      case 'tool_call_start': {
        const tc: ToolCallInfo = {
          id: d.id as string,
          name: d.name as string,
          input: d.input as Record<string, unknown>,
          status: 'running',
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, toolCalls: [...(m.toolCalls || []), tc] }
              : m
          )
        )
        break
      }
      case 'tool_call_end': {
        const id = d.id as string
        const status = d.status as 'completed' | 'error'
        const result = d.result
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls || []).map((tc) =>
                    tc.id === id ? { ...tc, status, result } : tc
                  ),
                }
              : m
          )
        )
        break
      }
      case 'error': {
        const error = d.error as string
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `Error: ${error}` }
              : m
          )
        )
        break
      }
    }
  }

  const handleClear = () => {
    if (isStreaming && abortRef.current) {
      abortRef.current.abort()
    }
    setMessages([])
    setIsStreaming(false)
  }

  const handleSuggestion = (label: string) => {
    handleSend(label)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[520px]"
      >
        {/* Header with gradient */}
        <SheetHeader className="flex-row items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-blue-600 px-5 py-4 space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-sm font-semibold text-white">
                Asistente GYS
              </SheetTitle>
              <SheetDescription className="text-xs text-blue-200">
                IA Comercial
              </SheetDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Limpiar conversación"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </SheetHeader>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[#f8fafc]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {messages.length === 0 ? (
            /* Welcome state */
            <div className="flex h-full flex-col items-center justify-center px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 mb-5">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                ¿En qué puedo ayudarte?
              </h3>
              <p className="text-xs text-gray-500 mb-6 text-center max-w-[280px]">
                Busco equipos, creo cotizaciones, analizo TDRs y más.
              </p>

              <div className="grid grid-cols-2 gap-2.5 w-full max-w-[360px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.label)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${s.color}`}
                  >
                    <s.icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-3">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={
            isStreaming ? 'Procesando...' : undefined
          }
        />
      </SheetContent>
    </Sheet>
  )
}
