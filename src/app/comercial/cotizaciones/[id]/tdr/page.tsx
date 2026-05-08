'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, FileSearch, Clock, FileText, PlusCircle, Upload, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'

import { useCotizacionContext } from '../cotizacion-context'
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
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { CotizacionTdrAnalisis, BloqueId } from '@/types/tdr'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TdrAnalisisPage() {
  const { cotizacion } = useCotizacionContext()
  const [analisis, setAnalisis] = useState<CotizacionTdrAnalisis | null>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [extraendoBloque, setExtraendoBloque] = useState<BloqueId | null>(null)
  const [prellenadoBloque, setPrellenadoBloque] = useState<BloqueId | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [prellenadoDatos, setPrellenadoDatos] = useState<any>(null)
  const [analizandoPdf, setAnalizandoPdf] = useState(false)
  const [faseAnalisis, setFaseAnalisis] = useState<string | null>(null)
  const inputPdfRef = useRef<HTMLInputElement>(null)

  const fetchAnalisis = useCallback(async () => {
    if (!cotizacion?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis`)
      if (res.ok) {
        const data = await res.json()
        setAnalisis(data.analisis ?? null)
      }
    } catch {
      toast.error('Error al cargar análisis TDR')
    } finally {
      setLoading(false)
    }
  }, [cotizacion?.id])

  useEffect(() => { fetchAnalisis() }, [fetchAnalisis])

  const crearAnalisisVacio = async () => {
    if (!cotizacion?.id) return
    setCreando(true)
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setAnalisis(data)
        toast.success('Análisis TDR creado')
      } else {
        toast.error('Error al crear análisis TDR')
      }
    } catch {
      toast.error('Error al crear análisis TDR')
    } finally {
      setCreando(false)
    }
  }

  const guardarBloque = async (datos: object) => {
    if (!cotizacion?.id) return
    const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
    if (!res.ok) throw new Error('Error al guardar')
    const { analisis: updated } = await res.json()
    setAnalisis(updated)
    toast.success('Bloque guardado')
  }

  const extraerConIA = async (bloque: BloqueId) => {
    if (!cotizacion?.id) return
    setExtraendoBloque(bloque)
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-extraer-bloque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloque }),
      })
      if (res.status === 501) {
        toast.info('Extracción por bloque próximamente disponible')
        return
      }
      if (!res.ok) {
        toast.error('Error en la extracción')
        return
      }
      const { datos } = await res.json()
      setPrellenadoDatos(datos)
      setPrellenadoBloque(bloque)
    } catch {
      toast.error('Error al conectar con el servidor')
    } finally {
      setExtraendoBloque(null)
    }
  }

  const cerrarPrellenado = () => {
    setPrellenadoBloque(null)
    setPrellenadoDatos(null)
  }

  const eliminarAnalisis = async () => {
    if (!cotizacion?.id) return
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Error al eliminar')
        return
      }
      setAnalisis(null)
      toast.success('Análisis TDR eliminado')
    } catch {
      toast.error('Error al conectar con el servidor')
    }
  }

  const analizarConIA = async (file: File) => {
    if (!cotizacion?.id) return
    setAnalizandoPdf(true)
    setFaseAnalisis('Preparando…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis/analizar-pdf`, {
        method: 'POST',
        body: fd,
      })

      // Errores pre-stream (auth, feature flag, file validation)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Error al analizar el PDF')
        return
      }

      // Leer SSE
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

  const scrollToBloque = (bloque: BloqueId) => {
    document.getElementById(`bloque-${bloque}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!cotizacion) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Cargando análisis TDR…</span>
      </div>
    )
  }

  if (!analisis) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b">
          <FileSearch className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Análisis TDR</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileSearch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <div>
              <h3 className="text-base font-medium mb-1">Sin análisis TDR</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sube el PDF del TDR para que la IA extraiga automáticamente todos los bloques,
                o inicializa manualmente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => inputPdfRef.current?.click()}
                disabled={analizandoPdf}
              >
                {analizandoPdf ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{faseAnalisis ?? 'Analizando…'}</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" />Analizar PDF con IA</>
                )}
              </Button>
              <Button variant="outline" onClick={crearAnalisisVacio} disabled={creando || analizandoPdf}>
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

  const completitud = calcularCompletitudGeneral(analisis as never)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Análisis TDR</h2>
          {analisis.nombreArchivo && (
            <Badge variant="outline" className="text-[10px]">{analisis.nombreArchivo}</Badge>
          )}
          {analisis.paginasPdf && (
            <Badge variant="outline" className="text-[10px]">{analisis.paginasPdf} pág.</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
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
                  Se borrará todo el análisis TDR de esta cotización. Podrás volver a crearlo
                  subiendo el PDF o inicializando manualmente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={eliminarAnalisis}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(analisis.updatedAt)}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchAnalisis} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
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

      {/* Barra de completitud */}
      <TdrCompletitudBar
        bloques={completitud.bloques}
        onBloqueClick={scrollToBloque}
      />

      {/* Resumen ejecutivo */}
      <TdrResumenEjecutivo
        narrativa={analisis.resumenEjecutivoNarrativa}
        puntos={analisis.resumenEjecutivoPuntos ?? undefined}
        onGuardar={async datos => {
          await guardarBloque(datos)
        }}
      />

      {/* 8 bloques */}
      <div className="space-y-4">
        <div id="bloque-identificacion">
          <BloqueIdentificacion
            datos={{
              clienteDetectado: analisis.clienteDetectado,
              proyectoDetectado: analisis.proyectoDetectado,
              ubicacionDetectada: analisis.ubicacionDetectada,
            }}
            estado={completitud.bloques.identificacion}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'identificacion' ? undefined : () => extraerConIA('identificacion')}
            prellenarConDatos={prellenadoBloque === 'identificacion' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-alcance">
          <BloqueAlcance
            datos={{
              resumenTdr: analisis.resumenTdr,
              alcanceDetectado: analisis.alcanceDetectado,
              requerimientos: analisis.requerimientos ?? [],
            }}
            estado={completitud.bloques.alcance}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'alcance' ? undefined : () => extraerConIA('alcance')}
            prellenarConDatos={prellenadoBloque === 'alcance' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-suministros">
          <BloqueSuministros
            datos={{
              equiposIdentificados: analisis.equiposIdentificados ?? [],
              serviciosIdentificados: analisis.serviciosIdentificados ?? [],
            }}
            estado={completitud.bloques.suministros}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'suministros' ? undefined : () => extraerConIA('suministros')}
            prellenarConDatos={prellenadoBloque === 'suministros' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-personal">
          <BloquePersonal
            datos={{
              personalRequerido: analisis.personalRequerido ?? [],
            }}
            estado={completitud.bloques.personal}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'personal' ? undefined : () => extraerConIA('personal')}
            prellenarConDatos={prellenadoBloque === 'personal' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-plazos">
          <BloquePlazos
            datos={{
              cronogramaEstimado: analisis.cronogramaEstimado ?? [],
              hitosContractuales: analisis.hitosContractuales ?? [],
            }}
            estado={completitud.bloques.plazos}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'plazos' ? undefined : () => extraerConIA('plazos')}
            prellenarConDatos={prellenadoBloque === 'plazos' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-ssoma">
          <BloqueSsoma
            datos={{
              normasAplicables: analisis.normasAplicables ?? [],
              documentosPrevios: analisis.documentosPrevios ?? [],
              riesgosCriticos: analisis.riesgosCriticos ?? [],
            }}
            estado={completitud.bloques.ssoma}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'ssoma' ? undefined : () => extraerConIA('ssoma')}
            prellenarConDatos={prellenadoBloque === 'ssoma' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-comercial">
          <BloqueComercial
            datos={{
              presupuestoEstimado: analisis.presupuestoEstimado,
              penalidades: analisis.penalidades ?? [],
              garantias: analisis.garantias,
            }}
            estado={completitud.bloques.comercial}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'comercial' ? undefined : () => extraerConIA('comercial')}
            prellenarConDatos={prellenadoBloque === 'comercial' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>

        <div id="bloque-entregables">
          <BloqueEntregables
            datos={{
              entregablesDossier: analisis.entregablesDossier ?? [],
            }}
            estado={completitud.bloques.entregables}
            onGuardar={async datos => { await guardarBloque(datos) }}
            onExtraerConIA={extraendoBloque === 'entregables' ? undefined : () => extraerConIA('entregables')}
            prellenarConDatos={prellenadoBloque === 'entregables' ? prellenadoDatos : null}
            onCerrarPrellenado={cerrarPrellenado}
          />
        </div>
      </div>
    </div>
  )
}
