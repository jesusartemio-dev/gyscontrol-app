'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CabeceraIperc } from './CabeceraIperc'
import { PreRequisitosPanelIperc } from './PreRequisitosPanelIperc'
import { BotonGenerarIaIperc } from './BotonGenerarIaIperc'
import { TablaFilasIperc } from './TablaFilasIperc'
import { EditorFilaSheet } from './EditorFilaSheet'
import { readSSEStreamIperc } from '@/lib/iperc/sse-consumer'
import type { IpercContexto, IpercCompleto } from '@/types/iperc'
import type { IpercFila } from '@/types/iperc'

interface Props {
  proyectoId: string
}

export default function IpercClient({ proyectoId }: Props) {
  const [contexto, setContexto] = useState<IpercContexto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // IA generation state
  const [generando, setGenerando] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [progreso, setProgreso] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Editor sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filaEditando, setFilaEditando] = useState<IpercFila | null>(null)

  // ─── Fetch contexto ────────────────────────────────────────────────────────
  const fetchContexto = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/contexto`)
      if (!res.ok) throw new Error('Error al cargar')
      const { data } = await res.json()
      setContexto(data as IpercContexto)
    } catch {
      setError('No se pudo cargar el IPERC')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => {
    fetchContexto()
  }, [fetchContexto])

  // ─── Crear IPERC ───────────────────────────────────────────────────────────
  const handleCrearIperc = async () => {
    if (!contexto) return
    const codigo = `GYS-${contexto.proyecto.codigo}-IPERC-001`
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoDocumento: codigo,
          area: 'INSTALACIONES',
          evaluadores: [],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al crear')
      }
      toast.success('IPERC creado')
      await fetchContexto()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear IPERC')
    }
  }

  // ─── Generar con IA ────────────────────────────────────────────────────────
  const handleGenerarIA = async () => {
    if (!contexto?.iperc) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setGenerando(true)
    setStatusMsg('Iniciando…')
    setProgreso(0)

    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/generar-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      await readSSEStreamIperc(
        res,
        {
          onStatus: (msg, prog) => {
            setStatusMsg(msg)
            if (prog != null) setProgreso(prog)
          },
          onFilasParciales: () => {},
          onCompletado: async () => {
            setProgreso(100)
            setStatusMsg('Completado')
            await fetchContexto()
            toast.success('IPERC generado con IA')
          },
        },
        ctrl.signal
      )
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return
      toast.error(e instanceof Error ? e.message : 'Error en generación')
    } finally {
      setGenerando(false)
      setStatusMsg('')
      setProgreso(null)
      abortRef.current = null
    }
  }

  // ─── Editar fila ───────────────────────────────────────────────────────────
  const handleEditarFila = (fila: IpercFila) => {
    setFilaEditando(fila)
    setSheetOpen(true)
  }

  const handleAgregarFila = () => {
    setFilaEditando(null)
    setSheetOpen(true)
  }

  // ─── Eliminar fila ─────────────────────────────────────────────────────────
  const handleEliminarFila = async (filaId: string) => {
    if (!confirm('¿Eliminar esta fila?')) return
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/iperc/filas/${filaId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Error al eliminar')
      setContexto(prev => {
        if (!prev?.iperc) return prev
        return {
          ...prev,
          iperc: {
            ...prev.iperc,
            filas: prev.iperc.filas
              .filter(f => f.id !== filaId)
              .map((f, idx) => ({ ...f, numero: idx + 1 })),
          },
        }
      })
      toast.success('Fila eliminada')
    } catch {
      toast.error('Error al eliminar fila')
    }
  }

  // ─── Saved fila ────────────────────────────────────────────────────────────
  const handleFilaSaved = (fila: IpercFila) => {
    setContexto(prev => {
      if (!prev?.iperc) return prev
      const existing = prev.iperc.filas.find(f => f.id === fila.id)
      const newFilas = existing
        ? prev.iperc.filas.map(f => (f.id === fila.id ? fila : f))
        : [...prev.iperc.filas, fila]
      return { ...prev, iperc: { ...prev.iperc, filas: newFilas } }
    })
  }

  // ─── Updated cabecera ──────────────────────────────────────────────────────
  const handleIpercUpdated = (iperc: IpercCompleto) => {
    setContexto(prev => prev ? { ...prev, iperc } : prev)
  }

  // ─── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !contexto) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
        <p>{error ?? 'Error desconocido'}</p>
        <Button variant="outline" size="sm" onClick={fetchContexto}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  const { iperc, preRequisitos, proyecto, iaHabilitada, generacionActiva } = contexto
  const isGenerando = generando || generacionActiva !== null

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">IPERC</h2>
          <p className="text-xs text-muted-foreground">{proyecto.nombre}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContexto}
          disabled={loading}
          className="h-8"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Pre-requisitos */}
      {!preRequisitos.cumple && (
        <PreRequisitosPanelIperc
          faltantes={preRequisitos.faltantes}
          proyectoId={proyectoId}
        />
      )}

      {/* Crear IPERC */}
      {!iperc && preRequisitos.cumple && (
        <div className="border rounded-md p-6 flex flex-col items-center gap-3 text-center bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No hay IPERC creado para este proyecto.
          </p>
          <Button onClick={handleCrearIperc} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Crear IPERC
          </Button>
        </div>
      )}

      {/* IPERC existente */}
      {iperc && (
        <>
          {/* Cabecera */}
          <CabeceraIperc
            proyectoId={proyectoId}
            iperc={iperc}
            onUpdated={handleIpercUpdated}
          />

          {/* Toolbar */}
          <div className="flex items-start flex-wrap gap-3">
            <BotonGenerarIaIperc
              generando={isGenerando}
              iaHabilitada={iaHabilitada}
              preRequisitosCumple={preRequisitos.cumple}
              statusMsg={statusMsg}
              progreso={progreso}
              onClick={handleGenerarIA}
            />

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleAgregarFila}
              disabled={isGenerando}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar fila
            </Button>

            {iperc.filas.length > 0 && (
              <span className="text-xs text-muted-foreground self-center">
                {iperc.filas.length} {iperc.filas.length === 1 ? 'fila' : 'filas'}
              </span>
            )}
          </div>

          {/* Generando in background (from server) */}
          {!generando && generacionActiva && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generación en progreso en segundo plano…
            </div>
          )}

          {/* Tabla */}
          <TablaFilasIperc
            filas={iperc.filas}
            onEdit={handleEditarFila}
            onDelete={handleEliminarFila}
          />
        </>
      )}

      {/* Editor Sheet */}
      <EditorFilaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        proyectoId={proyectoId}
        fila={filaEditando}
        onSaved={handleFilaSaved}
      />
    </div>
  )
}
