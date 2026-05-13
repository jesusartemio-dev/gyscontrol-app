'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { EventoSSE } from '@/lib/pets/generarConIa'

interface Props {
  proyectoId: string
  onComplete: () => void
  onError: (msg: string) => void
}

type LineaLog =
  | { tipo: 'info'; texto: string }
  | { tipo: 'ok'; texto: string }
  | { tipo: 'error'; texto: string }

export function PetsGenerator({ proyectoId, onComplete, onError }: Props) {
  const [lineas, setLineas] = useState<LineaLog[]>([])
  const [progreso, setProgreso] = useState(0)
  const [terminado, setTerminado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const addLinea = (linea: LineaLog) => {
    setLineas((prev) => [...prev, linea])
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    abortRef.current = ctrl

    async function run() {
      let res: Response
      try {
        res = await fetch(`/api/proyectos/${proyectoId}/pets/generar-ia`, {
          method: 'POST',
          signal: ctrl.signal,
        })
      } catch (e) {
        if (ctrl.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'Error de red'
        addLinea({ tipo: 'error', texto: msg })
        setTerminado(true)
        onError(msg)
        return
      }

      if (!res.ok) {
        const msg = `Error HTTP ${res.status}`
        addLinea({ tipo: 'error', texto: msg })
        setTerminado(true)
        onError(msg)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const procesarEvento = (json: string) => {
        let evento: EventoSSE
        try {
          evento = JSON.parse(json)
        } catch {
          return
        }

        switch (evento.tipo) {
          case 'inicio':
            addLinea({ tipo: 'info', texto: 'Iniciando generación con IA...' })
            setProgreso(5)
            break
          case 'progreso':
            addLinea({ tipo: 'info', texto: evento.mensaje })
            break
          case 'indice':
            addLinea({ tipo: 'ok', texto: `Índice generado: ${evento.etapas.length} etapas` })
            setProgreso(15)
            break
          case 'etapa_inicio':
            addLinea({
              tipo: 'info',
              texto: `Generando etapa ${evento.etapaLetra}: ${evento.etapaTitulo}...`,
            })
            break
          case 'etapa_ok':
            addLinea({
              tipo: 'ok',
              texto: `Etapa ${evento.etapaLetra} completada (${evento.pasosCount} pasos)`,
            })
            setProgreso((p) => Math.min(p + 8, 85))
            break
          case 'restricciones':
            addLinea({ tipo: 'ok', texto: `${evento.count} restricciones generadas` })
            setProgreso(90)
            break
          case 'guardado':
            addLinea({ tipo: 'ok', texto: 'PETS guardado en base de datos' })
            setProgreso(95)
            break
          case 'fin':
            addLinea({ tipo: 'ok', texto: '¡Generación completada!' })
            setProgreso(100)
            setTerminado(true)
            setTimeout(() => onComplete(), 1500)
            break
          case 'error':
            addLinea({ tipo: 'error', texto: evento.mensaje })
            setTerminado(true)
            onError(evento.mensaje)
            break
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop()!
          for (const part of parts) {
            const line = part.trim()
            if (line.startsWith('data: ')) {
              procesarEvento(line.slice(6))
            }
          }
        }
      } catch (e) {
        if (ctrl.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'Error de red'
        addLinea({ tipo: 'error', texto: msg })
        setTerminado(true)
        onError(msg)
      }
    }

    run()
    return () => ctrl.abort()
  }, [proyectoId, onComplete, onError])

  return (
    <div className="space-y-3">
      <Progress value={progreso} className="h-2" />
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto rounded border bg-gray-950 p-3 font-mono text-xs space-y-1"
      >
        {lineas.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            {l.tipo === 'ok' && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            )}
            {l.tipo === 'error' && (
              <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            {l.tipo === 'info' && (
              <Loader2 className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
            )}
            <span
              className={
                l.tipo === 'ok'
                  ? 'text-green-400'
                  : l.tipo === 'error'
                    ? 'text-red-400'
                    : 'text-gray-400'
              }
            >
              {l.texto}
            </span>
          </div>
        ))}
        {!terminado && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Procesando...</span>
          </div>
        )}
      </div>
    </div>
  )
}
