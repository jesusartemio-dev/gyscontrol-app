'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, RefreshCw, Trash2, Upload, PlusCircle, FileText, Clock, FileSearch } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { TdrCompletitudBar } from '@/components/tdr/TdrCompletitudBar'
import { TdrResumenEjecutivo } from '@/components/tdr/TdrResumenEjecutivo'
import {
  BloqueIdentificacion,
  BloqueAlcance,
  BloqueSuministros,
  BloquePersonal,
  BloquePlazos,
  BloqueSsoma,
  BloqueComercial,
  BloqueEntregables,
} from '@/components/tdr/bloques'
import {
  obtenerAnalisis,
  patchAnalisis,
  importarDesdeCotizacion,
  reimportarDesdeCotizacion,
  eliminarAnalisis,
} from '@/lib/tdr/cliente'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { ProyectoTdrAnalisis } from '@/types/tdr'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface EstadoVacio {
  puedeImportar: boolean
  cotizacionId: string | null
}

export default function TdrProyectoPage() {
  const params = useParams<{ id: string }>()
  const proyectoId = params.id

  const [analisis, setAnalisis] = useState<ProyectoTdrAnalisis | null>(null)
  const [estadoVacio, setEstadoVacio] = useState<EstadoVacio | null>(null)
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [analizandoPdf, setAnalizandoPdf] = useState(false)
  const [faseAnalisis, setFaseAnalisis] = useState<string | null>(null)
  const inputPdfRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await obtenerAnalisis('proyecto', proyectoId)
      if (r.ok) {
        setAnalisis(r.data as ProyectoTdrAnalisis)
        setEstadoVacio(null)
      } else {
        setAnalisis(null)
        setEstadoVacio({
          puedeImportar: r.body.puedeImportar ?? false,
          cotizacionId: r.body.cotizacionId ?? null,
        })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setCargando(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar])

  const guardarCampos = async (campos: object) => {
    const actualizado = await patchAnalisis('proyecto', proyectoId, campos)
    setAnalisis(actualizado as ProyectoTdrAnalisis)
    toast.success('Bloque guardado')
  }

  const importar = async () => {
    try {
      const data = await importarDesdeCotizacion(proyectoId)
      setAnalisis(data as ProyectoTdrAnalisis)
      setEstadoVacio(null)
      toast.success('Análisis importado desde cotización')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const reimportar = async () => {
    try {
      const data = await reimportarDesdeCotizacion(proyectoId)
      setAnalisis(data as ProyectoTdrAnalisis)
      toast.success('Análisis restaurado desde cotización')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const crearVacio = async () => {
    setCreando(true)
    try {
      const res = await fetch(`/api/proyecto/${proyectoId}/tdr-analisis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacio: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Error al crear análisis')
        return
      }
      const data = await res.json()
      setAnalisis(data as ProyectoTdrAnalisis)
      setEstadoVacio(null)
      toast.success('Análisis TDR creado')
    } catch {
      toast.error('Error al crear análisis TDR')
    } finally {
      setCreando(false)
    }
  }

  const eliminar = async () => {
    try {
      await eliminarAnalisis('proyecto', proyectoId)
      await cargar()
      toast.success('Análisis eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const analizarConIA = async (file: File) => {
    setAnalizandoPdf(true)
    setFaseAnalisis('Preparando…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/proyecto/${proyectoId}/tdr-analisis/analizar-pdf`, {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Error al analizar el PDF')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let event = 'message'
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (event === 'status') {
                setFaseAnalisis(data.mensaje ?? null)
              } else if (event === 'done') {
                setAnalisis(data.analisis)
                setEstadoVacio(null)
                toast.success('Análisis TDR extraído correctamente')
              } else if (event === 'error') {
                toast.error(data.mensaje ?? 'Error al procesar el PDF')
              }
            } catch { /* ignorar líneas mal formadas */ }
            event = 'message'
          }
        }
      }
    } catch {
      toast.error('Error al conectar con el servidor')
    } finally {
      setAnalizandoPdf(false)
      setFaseAnalisis(null)
      if (inputPdfRef.current) inputPdfRef.current.value = ''
    }
  }

  // ─── Cargando ─────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="space-y-4">
        <HeaderProyecto proyectoId={proyectoId} />
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Cargando análisis TDR…
        </div>
      </div>
    )
  }

  // ─── Estado vacío ─────────────────────────────────────────────
  if (!analisis) {
    return (
      <div className="space-y-4">
        <HeaderProyecto proyectoId={proyectoId} />
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div>
              <h3 className="text-base font-medium mb-1">Sin análisis TDR</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sube el PDF del TDR para que la IA extraiga automáticamente todos los bloques,
                importa desde la cotización origen o inicializa manualmente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
              <Button onClick={() => inputPdfRef.current?.click()} disabled={analizandoPdf}>
                {analizandoPdf ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{faseAnalisis ?? 'Analizando…'}</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Analizar PDF con IA</>
                )}
              </Button>
              {estadoVacio?.puedeImportar && (
                <Button variant="outline" onClick={importar} disabled={analizandoPdf}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Importar de cotización
                </Button>
              )}
              <Button variant="outline" onClick={crearVacio} disabled={creando || analizandoPdf}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {creando ? 'Creando…' : 'Inicializar manualmente'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <input
          ref={inputPdfRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) analizarConIA(file)
          }}
        />
      </div>
    )
  }

  // ─── Análisis cargado ─────────────────────────────────────────
  const completitud = calcularCompletitudGeneral(analisis as never)
  const fechaSnap = formatDate(analisis.fechaSnapshot)
  const tieneOrigen = analisis.cotizacionTdrOrigenId != null
  const linkCotizacion = analisis.cotizacionId
    ? `/comercial/cotizaciones/${analisis.cotizacionId}/tdr`
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1 pb-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Análisis de TDR</h2>
            {analisis.nombreArchivo && (
              <Badge variant="outline" className="text-[10px]">{analisis.nombreArchivo}</Badge>
            )}
            {analisis.paginasPdf && (
              <Badge variant="outline" className="text-[10px]">{analisis.paginasPdf} pág.</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Re-analizar PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputPdfRef.current?.click()}
              disabled={analizandoPdf}
            >
              {analizandoPdf ? (
                <><RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />{faseAnalisis ?? 'Analizando…'}</>
              ) : (
                <><Upload className="mr-1.5 h-3 w-3" />Re-analizar PDF</>
              )}
            </Button>

            {/* Re-importar desde cotización */}
            {tieneOrigen && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Re-importar de cotización
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Re-importar desde cotización?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto descartará todos los cambios hechos en el TDR del proyecto
                      y restaurará el estado actual de la cotización origen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={reimportar}>Re-importar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Eliminar */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar análisis TDR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borrará todo el análisis TDR de este proyecto. Podrás volver a crearlo
                    subiendo el PDF, importando desde la cotización o inicializando manualmente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={eliminar}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fechaSnap}
            </span>

            {tieneOrigen && linkCotizacion && (
              <Link
                href={linkCotizacion}
                className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-0.5"
              >
                ver cotización
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputPdfRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) analizarConIA(file)
        }}
      />

      <TdrCompletitudBar bloques={completitud.bloques} />

      <TdrResumenEjecutivo
        narrativa={analisis.resumenEjecutivoNarrativa}
        puntos={analisis.resumenEjecutivoPuntos ?? undefined}
        onGuardar={guardarCampos}
      />

      <div className="space-y-4">
        <BloqueIdentificacion
          datos={{
            clienteDetectado: analisis.clienteDetectado,
            proyectoDetectado: analisis.proyectoDetectado,
            ubicacionDetectada: analisis.ubicacionDetectada,
          }}
          estado={completitud.bloques.identificacion}
          onGuardar={guardarCampos}
        />
        <BloqueAlcance
          datos={{
            resumenTdr: analisis.resumenTdr,
            alcanceDetectado: analisis.alcanceDetectado,
            requerimientos: analisis.requerimientos ?? [],
          }}
          estado={completitud.bloques.alcance}
          onGuardar={guardarCampos}
        />
        <BloqueSuministros
          datos={{
            equiposIdentificados: analisis.equiposIdentificados ?? [],
            serviciosIdentificados: analisis.serviciosIdentificados ?? [],
          }}
          estado={completitud.bloques.suministros}
          onGuardar={guardarCampos}
        />
        <BloquePersonal
          datos={{ personalRequerido: analisis.personalRequerido ?? [] }}
          estado={completitud.bloques.personal}
          onGuardar={guardarCampos}
        />
        <BloquePlazos
          datos={{
            cronogramaEstimado: analisis.cronogramaEstimado ?? [],
            hitosContractuales: analisis.hitosContractuales ?? [],
          }}
          estado={completitud.bloques.plazos}
          onGuardar={guardarCampos}
        />
        <BloqueSsoma
          datos={{
            normasAplicables: analisis.normasAplicables ?? [],
            documentosPrevios: analisis.documentosPrevios ?? [],
            riesgosCriticos: analisis.riesgosCriticos ?? [],
          }}
          estado={completitud.bloques.ssoma}
          onGuardar={guardarCampos}
        />
        <BloqueComercial
          datos={{
            presupuestoEstimado: analisis.presupuestoEstimado,
            penalidades: analisis.penalidades ?? [],
            garantias: analisis.garantias,
          }}
          estado={completitud.bloques.comercial}
          onGuardar={guardarCampos}
        />
        <BloqueEntregables
          datos={{ entregablesDossier: analisis.entregablesDossier ?? [] }}
          estado={completitud.bloques.entregables}
          onGuardar={guardarCampos}
        />
      </div>
    </div>
  )
}

function HeaderProyecto({ proyectoId }: { proyectoId: string }) {
  void proyectoId
  return (
    <div className="space-y-1 pb-3 border-b">
      <h2 className="text-lg font-semibold">Análisis de TDR</h2>
    </div>
  )
}
