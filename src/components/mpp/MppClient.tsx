'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CabeceraMpp } from './CabeceraMpp'
import { BotonGenerarIaMpp } from './BotonGenerarIaMpp'
import { PreRequisitosPanelMpp } from './PreRequisitosPanelMpp'
import { TablaAsignacionesMpp } from './TablaAsignacionesMpp'
import { useProyectoContext } from '@/app/proyectos/[id]/ProyectoContext'

type Evaluador = { nombre: string; cargo: string }

interface MppEppCatalogo {
  id: string
  orden: number
  nombre: string
  riesgo: string
  parteCuerpo: string
  durabilidad: string | null
  asignacionesDefault: string[]
  activo: boolean
}

interface MppItem {
  id: string
  mppId: string
  mppEppCatalogoId: string
  orden: number
  asignaciones: Record<string, boolean>
  observaciones: string | null
  mppEppCatalogo: MppEppCatalogo
}

interface Mpp {
  id: string
  proyectoId: string
  codigoDocumento: string
  revision: string
  fechaElaboracion: string
  fechaActualizacion: string
  area: string
  gerencia: string
  evaluadores: Evaluador[]
  observaciones: string
  estado: 'borrador' | 'revisado' | 'aprobado'
  items: MppItem[]
}

interface Contexto {
  puestosDeIperc: string[]
  ipercExiste: boolean
  ipercTieneFilas: boolean
  mppExiste: boolean
  mppEstado: string | null
}

interface Props {
  proyectoId: string
}

export default function MppClient({ proyectoId }: Props) {
  const { proyecto } = useProyectoContext()

  const [contexto, setContexto] = useState<Contexto | null>(null)
  const [mpp, setMpp] = useState<Mpp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [generando, setGenerando] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [progreso, setProgreso] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const preRequisitosOk = Boolean(contexto?.ipercExiste && contexto?.ipercTieneFilas)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [ctxRes, mppRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/mpp/contexto`),
        fetch(`/api/proyectos/${proyectoId}/mpp`),
      ])
      if (!ctxRes.ok || !mppRes.ok) throw new Error('Error al cargar')
      const { data: ctx } = await ctxRes.json()
      const { mpp: mppData } = await mppRes.json()
      setContexto(ctx)
      setMpp(mppData)
    } catch {
      setError('No se pudo cargar el MPP')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleCrearMpp = async () => {
    if (!proyecto) return
    try {
      const codigoDocumento = `${proyecto.codigo}-MPP-001`
      const res = await fetch(`/api/proyectos/${proyectoId}/mpp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoDocumento, area: proyecto.nombre }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Error al crear')
      }
      const { mpp: nuevoMpp } = await res.json()
      setMpp(nuevoMpp)
      setContexto(prev => prev ? { ...prev, mppExiste: true } : prev)
      toast.success('MPP creado con asignaciones por defecto')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear MPP')
    }
  }

  const handleEliminarMpp = async () => {
    if (!confirm('¿Eliminar el MPP completo? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/mpp`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setMpp(null)
      setContexto(prev => prev ? { ...prev, mppExiste: false } : prev)
      toast.success('MPP eliminado')
    } catch {
      toast.error('Error al eliminar el MPP')
    }
  }

  const handleSseEvent = useCallback(async (event: Record<string, unknown>) => {
    switch (event.type) {
      case 'inicio':
        setStatusMsg(String(event.mensaje ?? 'Iniciando...'))
        setProgreso(10)
        break
      case 'contexto_cargado':
        setStatusMsg('Contexto cargado, llamando al modelo...')
        setProgreso(20)
        break
      case 'mpp_previo_eliminado':
        setStatusMsg('MPP anterior eliminado, creando nuevo...')
        setProgreso(30)
        break
      case 'llamando_modelo':
        setStatusMsg(`Consultando ${event.modelo}...`)
        setProgreso(40)
        break
      case 'respuesta_recibida':
        setStatusMsg('Respuesta recibida, procesando ajustes...')
        setProgreso(65)
        break
      case 'ajustes_recibidos':
        setStatusMsg(`${event.validos} ajustes IA · creando MPP...`)
        setProgreso(80)
        break
      case 'mpp_creado':
        setStatusMsg('MPP creado, guardando...')
        setProgreso(92)
        break
      case 'finalizado':
        setProgreso(100)
        setStatusMsg('Completado')
        await fetchAll()
        toast.success(
          `MPP generado: ${event.itemsCreados} EPPs · ${event.ajustesAplicados} ajustes IA aplicados`
        )
        break
      case 'error':
      case 'error_ia':
        toast.error(String(event.mensaje ?? 'Error en generación'))
        break
    }
  }, [fetchAll])

  const handleGenerarIA = async () => {
    if (!confirm('¿Generar MPP con IA? El MPP actual será reemplazado con asignaciones basadas en el análisis del IPERC.')) return

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setGenerando(true)
    setStatusMsg('Iniciando...')
    setProgreso(0)

    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/mpp/generar-ia`, {
        method: 'POST',
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      if (!res.body) throw new Error('Sin stream en respuesta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const dataLine = part.replace(/^data: /, '').trim()
          if (!dataLine) continue
          try {
            await handleSseEvent(JSON.parse(dataLine))
          } catch {}
        }
      }
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

  const handleItemsChange = (newItems: MppItem[]) => {
    setMpp(prev => prev ? { ...prev, items: newItems } : prev)
  }

  const handleMppUpdated = (partial: Partial<Mpp>) => {
    setMpp(prev => prev ? { ...prev, ...partial } : prev)
  }

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !contexto) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
        <p>{error ?? 'Error desconocido'}</p>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">MPP</h2>
          <p className="text-xs text-muted-foreground">
            Matriz de Puestos y Personal — Equipos de Protección Personal por puesto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={generando} className="h-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {mpp && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEliminarMpp}
              disabled={generando}
              className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar MPP
            </Button>
          )}
        </div>
      </div>

      {/* Pre-requisitos */}
      {!preRequisitosOk && (
        <PreRequisitosPanelMpp
          ipercExiste={contexto.ipercExiste}
          ipercTieneFilas={contexto.ipercTieneFilas}
          proyectoId={proyectoId}
        />
      )}

      {/* Crear MPP */}
      {!mpp && preRequisitosOk && (
        <div className="border rounded-md p-6 flex flex-col items-center gap-3 text-center bg-muted/20">
          <p className="text-sm text-muted-foreground">No hay MPP creado para este proyecto.</p>
          <Button onClick={handleCrearMpp} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Crear MPP (asignaciones por defecto)
          </Button>
        </div>
      )}

      {/* MPP existente */}
      {mpp && (
        <>
          <CabeceraMpp proyectoId={proyectoId} mpp={mpp} onUpdated={handleMppUpdated} />

          <div className="flex items-start flex-wrap gap-3">
            <BotonGenerarIaMpp
              generando={generando}
              preRequisitosOk={preRequisitosOk}
              statusMsg={statusMsg}
              progreso={progreso}
              onClick={handleGenerarIA}
            />
          </div>

          <TablaAsignacionesMpp
            proyectoId={proyectoId}
            items={mpp.items}
            disabled={generando}
            onItemsChange={handleItemsChange}
          />
        </>
      )}
    </div>
  )
}
