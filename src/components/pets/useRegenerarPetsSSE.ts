'use client'

import { useState, useRef, useCallback } from 'react'
import type { EventoRegenSSE } from '@/lib/pets/regenerarConIa'

export type EstadoRegenerar =
  | { activo: false }
  | {
      activo: true
      alcance: 'etapa' | 'paso'
      etapaIndex: number
      pasoIndex?: number
      mensajes: string[]
      error?: string
    }

// ── SSE stream reader ─────────────────────────────────────────────────────────

async function leerSSE(
  resp: Response,
  signal: AbortSignal,
  onEvento: (e: EventoRegenSSE) => void,
): Promise<void> {
  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()!
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        try {
          const evento = JSON.parse(line.slice(6)) as EventoRegenSSE
          onEvento(evento)
        } catch {
          // ignorar línea malformada
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRegenerarPetsSSE(proyectoId: string) {
  const [estado, setEstado] = useState<EstadoRegenerar>({ activo: false })
  const abortRef = useRef<AbortController | null>(null)

  const handleEvento = useCallback(
    (
      evento: EventoRegenSSE,
      alcance: 'etapa' | 'paso',
      etapaIndex: number,
      pasoIndex: number | undefined,
      onFin: () => void,
      onError: () => void,
    ) => {
      switch (evento.tipo) {
        case 'progreso':
          setEstado((prev) => {
            if (!prev.activo) return prev
            return { ...prev, mensajes: [...prev.mensajes, evento.mensaje] }
          })
          break
        case 'fin':
          setEstado({ activo: false })
          onFin()
          break
        case 'error':
          setEstado({
            activo: true,
            alcance,
            etapaIndex,
            pasoIndex,
            mensajes: [],
            error: evento.mensaje,
          })
          setTimeout(onError, 3000)
          break
      }
    },
    [],
  )

  const regenerarEtapa = useCallback(
    async (etapaIndex: number, onFin: () => void) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      setEstado({ activo: true, alcance: 'etapa', etapaIndex, mensajes: [] })

      const resetEstado = () => setEstado({ activo: false })

      try {
        const resp = await fetch(`/api/proyectos/${proyectoId}/pets/regenerar-etapa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etapaIndex }),
          signal: ctrl.signal,
        })

        if (!resp.ok || !resp.body) {
          const json = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
          setEstado({
            activo: true,
            alcance: 'etapa',
            etapaIndex,
            mensajes: [],
            error: (json as { error?: string }).error ?? 'Error',
          })
          setTimeout(resetEstado, 3000)
          return
        }

        await leerSSE(resp, ctrl.signal, (evento) =>
          handleEvento(evento, 'etapa', etapaIndex, undefined, onFin, resetEstado),
        )
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setEstado({
          activo: true,
          alcance: 'etapa',
          etapaIndex,
          mensajes: [],
          error: e instanceof Error ? e.message : 'Error de red',
        })
        setTimeout(resetEstado, 3000)
      }
    },
    [proyectoId, handleEvento],
  )

  const regenerarPaso = useCallback(
    async (etapaIndex: number, pasoIndex: number, onFin: () => void) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      setEstado({ activo: true, alcance: 'paso', etapaIndex, pasoIndex, mensajes: [] })

      const resetEstado = () => setEstado({ activo: false })

      try {
        const resp = await fetch(`/api/proyectos/${proyectoId}/pets/regenerar-paso`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etapaIndex, pasoIndex }),
          signal: ctrl.signal,
        })

        if (!resp.ok || !resp.body) {
          const json = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
          setEstado({
            activo: true,
            alcance: 'paso',
            etapaIndex,
            pasoIndex,
            mensajes: [],
            error: (json as { error?: string }).error ?? 'Error',
          })
          setTimeout(resetEstado, 3000)
          return
        }

        await leerSSE(resp, ctrl.signal, (evento) =>
          handleEvento(evento, 'paso', etapaIndex, pasoIndex, onFin, resetEstado),
        )
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setEstado({
          activo: true,
          alcance: 'paso',
          etapaIndex,
          pasoIndex,
          mensajes: [],
          error: e instanceof Error ? e.message : 'Error de red',
        })
        setTimeout(resetEstado, 3000)
      }
    },
    [proyectoId, handleEvento],
  )

  return { estado, regenerarEtapa, regenerarPaso }
}
