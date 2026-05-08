'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

  const cargar = async () => {
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
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId])

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

  const eliminar = async () => {
    try {
      await eliminarAnalisis('proyecto', proyectoId)
      await cargar()
      toast.success('Análisis eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  // ─── Estado cargando ─────────────────────────────────────
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

  // ─── Estado vacío ─────────────────────────────────────
  if (!analisis) {
    return (
      <div className="space-y-4">
        <HeaderProyecto proyectoId={proyectoId} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">Sin análisis de TDR</h2>
          {estadoVacio?.puedeImportar ? (
            <>
              <p className="text-sm text-muted-foreground max-w-md">
                La cotización origen tiene análisis de TDR. Puedes importarlo
                como snapshot del proyecto.
              </p>
              <Button onClick={importar}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Importar de cotización
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground max-w-md">
                {estadoVacio?.cotizacionId
                  ? 'La cotización origen no tiene análisis de TDR. Crea el análisis en la cotización primero.'
                  : 'Este proyecto no tiene cotización vinculada. El módulo TDR no aplica.'}
              </p>
              {estadoVacio?.cotizacionId && (
                <Button variant="outline" asChild>
                  <Link href={`/comercial/cotizaciones/${estadoVacio.cotizacionId}/tdr`}>
                    Ir a cotización
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const completitud = calcularCompletitudGeneral(analisis as never)
  const fechaSnap = new Date(analisis.fechaSnapshot).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const tieneOrigen = analisis.cotizacionTdrOrigenId != null
  const linkCotizacion = analisis.cotizacionId
    ? `/comercial/cotizaciones/${analisis.cotizacionId}/tdr`
    : null

  return (
    <div className="space-y-5">
      <HeaderProyecto
        proyectoId={proyectoId}
        infoSnapshot={
          <span className="text-xs text-muted-foreground">
            Snapshot del {fechaSnap}
            {tieneOrigen && linkCotizacion ? (
              <>
                {' · '}
                <Link href={linkCotizacion} className="hover:underline inline-flex items-center gap-0.5">
                  ver cotización origen
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            ) : tieneOrigen ? (
              ' · desde cotización origen'
            ) : null}
          </span>
        }
        onReimportar={tieneOrigen ? reimportar : undefined}
        onEliminar={eliminar}
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

function HeaderProyecto({
  proyectoId,
  infoSnapshot,
  onReimportar,
  onEliminar,
}: {
  proyectoId: string
  infoSnapshot?: React.ReactNode
  onReimportar?: () => void | Promise<void>
  onEliminar?: () => void | Promise<void>
}) {
  return (
    <div className="space-y-1 pb-3 border-b">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Análisis de TDR</h2>
        <div className="flex gap-2">
          {onReimportar && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Re-importar desde cotización
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
                  <AlertDialogAction onClick={onReimportar}>Re-importar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {onEliminar && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Eliminar snapshot
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar snapshot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto borra el análisis TDR del proyecto. Si la cotización origen
                    tiene análisis, podrás importarlo nuevamente después.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onEliminar}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {infoSnapshot && <div className="text-xs text-muted-foreground">{infoSnapshot}</div>}
    </div>
  )
}
