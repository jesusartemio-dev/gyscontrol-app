'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, RefreshCw, Loader2, Info, Trash2, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CabeceraIperc } from './CabeceraIperc'
import { PreRequisitosPanelIperc } from './PreRequisitosPanelIperc'
import { BotonGenerarIaIperc } from './BotonGenerarIaIperc'
import { SeleccionEdtsModal } from './SeleccionEdtsModal'
import { TablaFilasIperc } from './TablaFilasIperc'
import { EditorFilaSheet } from './EditorFilaSheet'
import { VersionRevisadaIperc } from './VersionRevisadaIperc'
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

  // Info shown after generation
  const [cobertura, setCobertura] = useState<{
    totalFilas: number
    totalTareas: number
    edtsEvaluados: number
    modelosUsados: { sonnet: number; haiku: number }
    lotesFallidos: number
  } | null>(null)

  // EDT selection modal
  const [modalEdtsOpen, setModalEdtsOpen] = useState(false)

  // Editor sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filaEditando, setFilaEditando] = useState<IpercFila | null>(null)

  // Export state
  const [descargando, setDescargando] = useState(false)

  // Versión revisada (subir + ver) state
  const [subiendoVersion, setSubiendoVersion] = useState(false)
  const [tieneVersionRevisada, setTieneVersionRevisada] = useState(false)
  const [vistaIperc, setVistaIperc] = useState<'estructurada' | 'revisada'>('estructurada')
  const vistaIpercInicializadaRef = useRef(false)
  const inputVersionRef = useRef<HTMLInputElement>(null)

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

  // Detecta si hay una versión revisada vigente — default automático a esa
  // pestaña la PRIMERA vez que se detecta una (no forzar de nuevo si el
  // usuario vuelve manualmente a la vista estructurada).
  useEffect(() => {
    if (!contexto?.iperc) return
    let cancelado = false
    fetch(`/api/proyectos/${proyectoId}/iperc/version-revisada`)
      .then(res => (res.ok ? res.json() : { data: null }))
      .then(({ data }) => {
        if (cancelado) return
        const hay = !!data
        setTieneVersionRevisada(hay)
        if (!vistaIpercInicializadaRef.current) {
          if (hay) setVistaIperc('revisada')
          vistaIpercInicializadaRef.current = true
        }
      })
      .catch(() => {})
    return () => { cancelado = true }
  }, [proyectoId, contexto?.iperc?.id])

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

  // ─── Abrir modal de selección de EDTs ─────────────────────────────────────
  const handleAbrirModal = () => {
    setModalEdtsOpen(true)
  }

  // ─── Generar con IA ────────────────────────────────────────────────────────
  const handleGenerarIA = async (edtIds: string[]) => {
    if (!contexto?.iperc) return
    setModalEdtsOpen(false)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setGenerando(true)
    setStatusMsg('Iniciando…')
    setProgreso(0)
    setCobertura(null)

    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/generar-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edtIds }),
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
          onFilasParciales: (filas) => {
            const nuevas = filas as IpercFila[]
            setContexto(prev => {
              if (!prev?.iperc) return prev
              const existentes = new Set(prev.iperc.filas.map(f => f.id))
              const sinDuplicar = nuevas.filter(f => !existentes.has(f.id))
              if (sinDuplicar.length === 0) return prev
              return {
                ...prev,
                iperc: { ...prev.iperc, filas: [...prev.iperc.filas, ...sinDuplicar] },
              }
            })
          },
          onCompletado: async (data) => {
            setProgreso(100)
            setStatusMsg('Completado')
            await fetchContexto()
            toast.success('IPERC generado con IA')
            const totalFilas = typeof data.totalFilas === 'number' ? data.totalFilas : 0
            const totalTareas = typeof data.totalTareas === 'number' ? data.totalTareas : 0
            const edtsEvaluados = typeof data.edtsEvaluados === 'number' ? data.edtsEvaluados : 0
            const lotesFallidos = typeof data.lotesFallidos === 'number' ? data.lotesFallidos : 0
            const modelosUsados = data.modelosUsados && typeof data.modelosUsados === 'object'
              ? data.modelosUsados as { sonnet: number; haiku: number }
              : { sonnet: 0, haiku: 0 }
            setCobertura({ totalFilas, totalTareas, edtsEvaluados, modelosUsados, lotesFallidos })
          },
          onLoteFallido: (num, msg) => {
            toast.warning(`Lote ${num} falló: ${msg}. Los otros lotes continúan.`)
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

  // ─── Eliminar IPERC completo ───────────────────────────────────────────────
  const handleEliminarIperc = async () => {
    if (!confirm('¿Eliminar el IPERC completo? Se borrarán todas las filas. Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setContexto(prev => prev ? { ...prev, iperc: null } : prev)
      setCobertura(null)
      toast.success('IPERC eliminado')
    } catch {
      toast.error('Error al eliminar el IPERC')
    }
  }

  // ─── Exportar Excel ────────────────────────────────────────────────────────
  const handleExportarExcel = async () => {
    if (!iperc || iperc.filas.length === 0) {
      toast.error('No hay filas para exportar')
      return
    }
    setDescargando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/exportar-xlsx`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(err.error)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${iperc.codigoDocumento}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Excel descargado correctamente')
    } catch (e) {
      toast.error(`Error al exportar: ${e instanceof Error ? e.message : 'Error'}`)
    } finally {
      setDescargando(false)
    }
  }

  // ─── Subir versión revisada ────────────────────────────────────────────────
  const handleSubirVersion = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Solo se admiten archivos .xlsx')
      return
    }
    setSubiendoVersion(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/proyectos/${proyectoId}/iperc/subir-version`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al subir la versión')
      }
      toast.success('Versión revisada subida')
      setTieneVersionRevisada(true)
      setVistaIperc('revisada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la versión')
    } finally {
      setSubiendoVersion(false)
      if (inputVersionRef.current) inputVersionRef.current.value = ''
    }
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

  const contenidoEstructuradoIperc = iperc && (
    <>
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
        onGenerar={handleAbrirModal}
        onAgregar={handleAgregarFila}
      />

      {/* Resumen post-generación */}
      {cobertura && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 text-sm">IPERC generado con IA</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs space-y-1">
            <p>
              <strong>{cobertura.totalFilas} filas</strong> generadas a partir de{' '}
              <strong>{cobertura.totalTareas} tareas</strong> en{' '}
              <strong>{cobertura.edtsEvaluados} {cobertura.edtsEvaluados === 1 ? 'EDT' : 'EDTs'}</strong>.
              {(cobertura.modelosUsados.sonnet > 0 || cobertura.modelosUsados.haiku > 0) && (
                <> Modelos: {[
                  cobertura.modelosUsados.sonnet > 0 ? `Sonnet (${cobertura.modelosUsados.sonnet} ${cobertura.modelosUsados.sonnet === 1 ? 'lote' : 'lotes'})` : null,
                  cobertura.modelosUsados.haiku > 0 ? `Haiku (${cobertura.modelosUsados.haiku} ${cobertura.modelosUsados.haiku === 1 ? 'lote' : 'lotes'})` : null,
                ].filter(Boolean).join(', ')}.</>
              )}
            </p>
            {cobertura.lotesFallidos > 0 && (
              <p className="text-amber-600">
                ⚠ {cobertura.lotesFallidos} {cobertura.lotesFallidos === 1 ? 'lote falló' : 'lotes fallaron'} — algunas tareas no tienen filas. Podés agregarlas manualmente.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  )

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">IPERC</h2>
          <p className="text-xs text-muted-foreground">{proyecto.nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContexto}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {iperc && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEliminarIperc}
              disabled={isGenerando}
              className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar IPERC
            </Button>
          )}
        </div>
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
              onClick={handleAbrirModal}
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

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleExportarExcel}
              disabled={descargando || isGenerando || iperc.filas.length === 0}
            >
              {descargando
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Download className="h-4 w-4 mr-1" />}
              {descargando ? 'Generando…' : 'Exportar Excel'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => inputVersionRef.current?.click()}
              disabled={subiendoVersion}
            >
              {subiendoVersion
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Upload className="h-4 w-4 mr-1" />}
              {subiendoVersion ? 'Subiendo…' : 'Subir versión revisada'}
            </Button>
            <input
              ref={inputVersionRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => handleSubirVersion(e.target.files)}
            />

            {iperc.filas.length > 0 && (
              <span className="text-xs text-muted-foreground self-center">
                {iperc.filas.length} {iperc.filas.length === 1 ? 'fila' : 'filas'}
              </span>
            )}
          </div>

          {tieneVersionRevisada ? (
            <Tabs value={vistaIperc} onValueChange={(v) => setVistaIperc(v as 'estructurada' | 'revisada')}>
              <TabsList>
                <TabsTrigger value="estructurada">Vista estructurada (app)</TabsTrigger>
                <TabsTrigger value="revisada">Versión revisada</TabsTrigger>
              </TabsList>
              <TabsContent value="estructurada" className="space-y-4 mt-2">
                {contenidoEstructuradoIperc}
              </TabsContent>
              <TabsContent value="revisada" className="mt-2">
                <VersionRevisadaIperc proyectoId={proyectoId} />
              </TabsContent>
            </Tabs>
          ) : (
            contenidoEstructuradoIperc
          )}
        </>
      )}

      {/* Modal selección de EDTs */}
      <SeleccionEdtsModal
        open={modalEdtsOpen}
        proyectoId={proyectoId}
        onClose={() => setModalEdtsOpen(false)}
        onConfirmar={handleGenerarIA}
        generando={generando}
      />

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
