'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sparkles,
  Trash2,
  X,
  Package,
  FileEdit,
  FileSearch,
  BarChart3,
  ShieldCheck,
  Plus,
  ChevronDown,
  MessageSquare,
  Clock,
  FileText,
  Search,
  Loader2,
  PenLine,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import {
  dbMessageToChatMessage,
} from '@/lib/agente/types'
import type {
  ChatMessage as ChatMessageType,
  ChatAttachment,
  ToolCallInfo,
  ConversacionListItem,
  ConversacionFull,
  AgentStatusPhase,
} from '@/lib/agente/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cotizacionId?: string
}

const SUGGESTIONS = [
  { icon: Package, label: 'Buscar equipos', color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { icon: FileEdit, label: 'Nueva cotización', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { icon: FileSearch, label: 'Analizar TDR', color: 'text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100' },
  { icon: BarChart3, label: 'Ver mi pipeline', color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' },
]

// ── Tool display names for status banner ──
const TOOL_STATUS_LABELS: Record<string, string> = {
  buscar_equipos_catalogo: 'Buscando equipos...',
  buscar_servicios_catalogo: 'Buscando servicios...',
  buscar_gastos_catalogo: 'Buscando gastos...',
  buscar_clientes: 'Buscando clientes...',
  buscar_recursos: 'Buscando recursos...',
  buscar_cotizaciones_similares: 'Buscando cotizaciones...',
  buscar_proyectos: 'Buscando proyectos...',
  obtener_edts: 'Consultando EDTs...',
  obtener_unidades: 'Consultando unidades...',
  obtener_detalle_proyecto: 'Cargando proyecto...',
  buscar_listas_equipo: 'Buscando listas...',
  obtener_cronograma_proyecto: 'Consultando cronograma...',
  buscar_ordenes_compra: 'Buscando órdenes...',
  crear_cotizacion: 'Creando cotización...',
  agregar_equipos: 'Agregando equipos...',
  agregar_servicios: 'Agregando servicios...',
  agregar_gastos: 'Agregando gastos...',
  agregar_condiciones: 'Agregando condiciones...',
  agregar_exclusiones: 'Agregando exclusiones...',
  recalcular_cotizacion: 'Recalculando totales...',
  obtener_resumen_cotizacion: 'Obteniendo resumen...',
  generar_consultas_tdr: 'Analizando documento...',
}

function getStatusConfig(phase: AgentStatusPhase, detail?: string): { icon: typeof Loader2; text: string; color: string } | null {
  switch (phase) {
    case 'analyzing_pdf':
      return {
        icon: FileText,
        text: detail
          ? `Analizando "${detail}"... (puede tomar hasta 1 min)`
          : 'Analizando documento... (puede tomar hasta 1 min)',
        color: 'text-violet-700 bg-violet-50 border-violet-200',
      }
    case 'executing_tools':
      return {
        icon: Search,
        text: detail
          ? (TOOL_STATUS_LABELS[detail] || `Ejecutando ${detail}...`)
          : 'Consultando datos...',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
      }
    case 'generating':
      return {
        icon: PenLine,
        text: detail === 'rate_limit_wait'
          ? 'Procesando cotizacion... esto puede tomar unos minutos por la cantidad de items.'
          : 'Generando respuesta...',
        color: detail === 'rate_limit_wait'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      }
    default:
      return null
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

// ── Status Banner Component ──
function StatusBanner({ phase, detail }: { phase: AgentStatusPhase; detail?: string }) {
  const config = getStatusConfig(phase, detail)
  if (!config) return null

  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-t text-xs font-medium animate-in fade-in slide-in-from-bottom-1 duration-200 ${config.color}`}>
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{config.text}</span>
      {/* Indeterminate progress bar */}
      <div className="ml-auto h-1 w-16 rounded-full bg-current/10 overflow-hidden shrink-0">
        <div className="h-full w-1/2 rounded-full bg-current/30 animate-[shimmer_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  )
}

export function ChatPanel({ open, onOpenChange, cotizacionId }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusPhase, setStatusPhase] = useState<AgentStatusPhase>('idle')
  const [statusDetail, setStatusDetail] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Conversation state ──
  const [conversacionId, setConversacionId] = useState<string | null>(null)
  const [conversacionTitulo, setConversacionTitulo] = useState<string | null>(null)
  const [conversaciones, setConversaciones] = useState<ConversacionListItem[]>([])
  const [showConversaciones, setShowConversaciones] = useState(false)
  const [isLoadingConversacion, setIsLoadingConversacion] = useState(false)
  const hasAutoLoadedRef = useRef(false)
  const prevCotizacionIdRef = useRef(cotizacionId)

  // Fetch conversations and auto-load last one when panel opens or cotizacion changes
  useEffect(() => {
    if (!open) return

    // If cotizacionId changed while open, reset state for the new cotización
    if (prevCotizacionIdRef.current !== cotizacionId) {
      prevCotizacionIdRef.current = cotizacionId
      setMessages([])
      setConversacionId(null)
      setConversacionTitulo(null)
      hasAutoLoadedRef.current = false
    }

    const init = async () => {
      try {
        const qs = cotizacionId
          ? `/api/agente/conversaciones?limit=10&cotizacionId=${cotizacionId}`
          : '/api/agente/conversaciones?limit=10'
        const res = await fetch(qs)
        if (!res.ok) return
        const convs: ConversacionListItem[] = await res.json()
        setConversaciones(convs)
        // Auto-load the most recent conversation if panel has no active chat
        if (convs.length > 0 && !hasAutoLoadedRef.current && !conversacionId) {
          hasAutoLoadedRef.current = true
          await doLoadConversacion(convs[0].id)
        }
      } catch {
        // Silently fail
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cotizacionId])

  const fetchConversaciones = async () => {
    try {
      const qs = cotizacionId
        ? `/api/agente/conversaciones?limit=10&cotizacionId=${cotizacionId}`
        : '/api/agente/conversaciones?limit=10'
      const res = await fetch(qs)
      if (res.ok) {
        const data = await res.json()
        setConversaciones(data)
      }
    } catch {
      // Silently fail
    }
  }

  const doLoadConversacion = async (id: string) => {
    setIsLoadingConversacion(true)
    try {
      const res = await fetch(`/api/agente/conversaciones/${id}`)
      if (!res.ok) {
        console.error('[ChatPanel] Failed to load conversation:', res.status)
        return
      }
      const data: ConversacionFull = await res.json()
      setConversacionId(data.id)
      setConversacionTitulo(data.titulo)
      const msgs = Array.isArray(data.mensajes)
        ? data.mensajes.map(dbMessageToChatMessage)
        : []
      setMessages(msgs)
      setShowConversaciones(false)
      // Scroll to bottom after DOM update
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'auto',
        })
      })
    } catch (err) {
      console.error('[ChatPanel] Error loading conversation:', err)
    } finally {
      setIsLoadingConversacion(false)
    }
  }

  const loadConversacion = (id: string) => doLoadConversacion(id)

  const handleNewConversacion = () => {
    setConversacionId(null)
    setConversacionTitulo(null)
    setMessages([])
    setShowConversaciones(false)
    hasAutoLoadedRef.current = true // Don't auto-load again after clearing
  }

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/agente/conversaciones/${id}`, { method: 'DELETE' })
    setConversaciones((prev) => prev.filter((c) => c.id !== id))
    if (conversacionId === id) {
      handleNewConversacion()
    }
  }

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
      setStatusPhase('generating')
      setStatusDetail(undefined)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/agente/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            conversacionId,
            cotizacionId,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Error de conexion' }))
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
        setStatusPhase('idle')
        setStatusDetail(undefined)
        abortRef.current = null
        fetchConversaciones()
      }
    },
    [messages, isStreaming, conversacionId, cotizacionId]
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
      case 'status': {
        const phase = d.phase as AgentStatusPhase
        const detail = d.detail as string | undefined
        setStatusPhase(phase)
        setStatusDetail(detail)
        break
      }
      case 'conversation_info': {
        const info = d as { conversacionId: string; titulo: string }
        setConversacionId(info.conversacionId)
        setConversacionTitulo(info.titulo)
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
    setConversacionId(null)
    setConversacionTitulo(null)
    setIsStreaming(false)
    setStatusPhase('idle')
    setStatusDetail(undefined)
  }

  const handleSuggestion = (label: string) => {
    handleSend(label)
  }

  const displayTitle = conversacionTitulo || 'Asistente GYS'

  // Compute streaming assistant message ID for ChatMessage component
  const streamingAssistantId = isStreaming
    ? messages.find((m) => m.role === 'assistant' && m.id.startsWith('assistant-'))?.id ?? null
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[520px] [&>button:first-child]:hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="flex-row items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] px-5 py-4 space-y-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <Popover open={showConversaciones} onOpenChange={setShowConversaciones}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-left group min-w-0">
                  <div className="min-w-0">
                    <SheetTitle className="text-sm font-semibold text-white leading-tight truncate max-w-[250px]">
                      {displayTitle}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-1.5 text-[11px] text-blue-200 mt-0.5">
                      {isStreaming ? (
                        <>
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          En linea
                        </>
                      )}
                      <ChevronDown className="h-3 w-3 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </SheetDescription>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start" sideOffset={8}>
                {/* New conversation */}
                <button
                  onClick={handleNewConversacion}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nueva conversacion
                </button>
                <div className="border-t" />
                {/* Conversation list */}
                <div className="max-h-64 overflow-y-auto">
                  {conversaciones.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No hay conversaciones anteriores
                    </div>
                  ) : (
                    conversaciones.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversacion(conv.id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors group/item ${
                          conversacionId === conv.id ? 'bg-accent' : ''
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{conv.titulo || 'Sin titulo'}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {timeAgo(conv.updatedAt)}
                            <span className="mx-0.5">·</span>
                            {conv._count.mensajes} msgs
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleArchive(conv.id, e)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                          title="Archivar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                title="Nueva conversacion"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* ── Messages area ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[#f8fafc]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #e2e8f0 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
          }}
        >
          {isLoadingConversacion ? (
            /* ── Loading conversation state ── */
            <div className="flex h-full flex-col items-center justify-center px-8">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Cargando conversacion...</p>
            </div>
          ) : messages.length === 0 ? (
            /* ── Welcome state ── */
            <div className="flex h-full flex-col items-center justify-center px-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg shadow-blue-500/25 mb-5">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-base font-semibold text-[#1e293b] mb-1">
                Hola! Soy tu asistente comercial
              </h3>
              <p className="text-xs text-[#64748b] mb-6 text-center max-w-[300px]">
                Puedo ayudarte con:
              </p>

              <div className="grid grid-cols-2 gap-2.5 w-full max-w-[340px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.label)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${s.color}`}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 mt-8 text-[10px] text-[#94a3b8]">
                <ShieldCheck className="h-3 w-3" />
                <span>Powered by AI · Los datos no salen de tu empresa</span>
              </div>
            </div>
          ) : (
            <div className="py-3">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={msg.id === streamingAssistantId}
                  isLastMessage={idx === messages.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Status Banner ── */}
        {isStreaming && statusPhase !== 'idle' && (
          <StatusBanner phase={statusPhase} detail={statusDetail} />
        )}

        {/* ── Input ── */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={
            isStreaming ? 'Esperando respuesta del asistente...' : undefined
          }
        />
      </SheetContent>
    </Sheet>
  )
}
