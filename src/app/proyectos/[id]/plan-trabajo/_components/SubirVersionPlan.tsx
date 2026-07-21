'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2, ImageUp, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'

interface Props {
  proyectoId: string
  /** plan.alcanceDetallado ya casteado — para construir el selector de EDT/Actividad/Tarea al asignar una foto pendiente. */
  alcanceDetallado: PlanAlcanceDetalladoEdt[]
  onVersionSubida?: () => Promise<void> | void
}

interface ImagenPendiente {
  id: string
  nombreArchivo: string
  /** Si está seteado, esta foto ocupa el mismo "Figura N." que esta PlanTrabajoImagen existente pero con bytes distintos — probablemente la reemplaza. */
  posibleReemplazoDeId: string | null
}

interface OpcionTarea {
  valor: string // `${edtRef}::${tareaRef}`
  etiqueta: string
}

// Múltiplo de 256 KiB (requerido por la API de subida resumable de Drive) y
// bien por debajo del límite de tamaño de request de las funciones serverless.
const TAMANO_PEDAZO = 3 * 1024 * 1024

function construirOpcionesTarea(alcanceDetallado: PlanAlcanceDetalladoEdt[]): OpcionTarea[] {
  const opciones: OpcionTarea[] = []
  for (const edt of alcanceDetallado) {
    if (!edt.edtRefId) continue
    for (const sub of edt.subItems ?? []) {
      for (const tarea of (sub.tareas ?? []).filter(t => !t.excluida)) {
        if (!tarea.tareaRefId) continue
        opciones.push({
          valor: `${edt.edtRefId}::${tarea.tareaRefId}`,
          etiqueta: `${edt.numeracion} ${edt.edtNombre} › ${sub.actividadNombre} › ${tarea.texto || tarea.nombre}`,
        })
      }
    }
  }
  return opciones
}

export function SubirVersionPlan({ proyectoId, alcanceDetallado, onVersionSubida }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [pendientes, setPendientes] = useState<ImagenPendiente[]>([])
  const [revisionAbierta, setRevisionAbierta] = useState(false)
  const [seleccion, setSeleccion] = useState<Record<string, string>>({})
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const opcionesTarea = construirOpcionesTarea(alcanceDetallado)

  const cargarPendientes = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes`)
      if (res.ok) {
        const { data } = await res.json()
        setPendientes(data)
      }
    } catch {
      // Best-effort — no bloquea la página principal.
    }
  }, [proyectoId])

  useEffect(() => { cargarPendientes() }, [cargarPendientes])

  const handleSubir = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Solo se admiten archivos .docx')
      return
    }
    setSubiendo(true)
    try {
      // Paso 1: iniciar sesión resumable — nuestro servidor no recibe el archivo.
      const resIniciar = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/subir-version/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      })
      if (!resIniciar.ok) {
        const e = await resIniciar.json().catch(() => ({}))
        throw new Error(e.error ?? 'No se pudo iniciar la subida')
      }
      const { data: sesion } = await resIniciar.json()

      // Paso 2: el navegador manda el archivo en pedazos chicos a NUESTRO
      // servidor, que los reenvía a la sesión resumable de Drive. Subir
      // directo del navegador a googleapis.com choca con CORS (Drive crea
      // el archivo pero no deja leer la respuesta), así que este relevo
      // evita tanto el CORS como el límite de tamaño de request.
      let driveFileId: string | null = null
      for (let inicio = 0; inicio < file.size; inicio += TAMANO_PEDAZO) {
        const fin = Math.min(inicio + TAMANO_PEDAZO, file.size)
        const pedazo = file.slice(inicio, fin)
        const resChunk = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/subir-version/chunk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Session-Uri': sesion.sessionUri,
            'X-Range-Start': String(inicio),
            'X-Range-End': String(fin - 1),
            'X-Total-Size': String(file.size),
          },
          body: pedazo,
        })
        if (!resChunk.ok) {
          const e = await resChunk.json().catch(() => ({}))
          throw new Error(e.error ?? 'No se pudo subir el archivo a Drive')
        }
        const { data } = await resChunk.json()
        if (data.done) {
          driveFileId = data.driveFileId
          break
        }
      }
      if (!driveFileId) {
        throw new Error('No se pudo completar la subida a Drive')
      }

      // Paso 3: nuestro servidor descarga de Drive y procesa (JSON chico, sin el archivo).
      const resCompletar = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/subir-version/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId,
          archivoNombre: sesion.archivoNombre,
          tamanioBytes: file.size,
        }),
      })
      if (!resCompletar.ok) {
        const e = await resCompletar.json().catch(() => ({}))
        throw new Error(e.error ?? 'Se subió pero falló al procesar — contactá soporte')
      }
      const { data } = await resCompletar.json()
      toast.success(
        data.imagenesNuevasPendientes > 0
          ? `Versión subida. ${data.imagenesNuevasPendientes} foto(s) para revisar.`
          : 'Versión subida.'
      )
      await cargarPendientes()
      await onVersionSubida?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la versión')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleAsignar = async (imagenId: string) => {
    const valor = seleccion[imagenId]
    if (!valor) {
      toast.error('Elegí a qué tarea pertenece esta foto')
      return
    }
    const [edtRef, tareaRef] = valor.split('::')
    setProcesandoId(imagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes/${imagenId}/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edtRef, tareaRef }),
      })
      if (!res.ok) throw new Error('Error al asignar la foto')
      setPendientes(prev => prev.filter(p => p.id !== imagenId))
      toast.success('Foto asignada')
      await onVersionSubida?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar la foto')
    } finally {
      setProcesandoId(null)
    }
  }

  const handleReemplazar = async (imagenId: string) => {
    setProcesandoId(imagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes/${imagenId}/reemplazar`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al reemplazar la foto')
      setPendientes(prev => prev.filter(p => p.id !== imagenId))
      toast.success('Foto reemplazada')
      await onVersionSubida?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reemplazar la foto')
    } finally {
      setProcesandoId(null)
    }
  }

  const handleDescartar = async (imagenId: string) => {
    setProcesandoId(imagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes/${imagenId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al descartar la foto')
      setPendientes(prev => prev.filter(p => p.id !== imagenId))
      toast.success('Foto descartada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al descartar la foto')
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={subiendo} className="gap-1.5">
        {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        Subir versión revisada
      </Button>
      <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={e => handleSubir(e.target.files)} />

      {pendientes.length > 0 && (
        <div className="w-full flex items-center gap-2 border border-amber-200 bg-amber-50 rounded-md px-3 py-1.5 text-xs text-amber-900">
          <ImageUp size={14} className="shrink-0" />
          <span className="flex-1">
            {pendientes.length} foto{pendientes.length > 1 ? 's' : ''} de la versión subida para revisar.
          </span>
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 shrink-0 bg-white" onClick={() => setRevisionAbierta(true)}>
            Revisar
          </Button>
        </div>
      )}

      <Dialog open={revisionAbierta} onOpenChange={setRevisionAbierta}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fotos de la versión subida — revisar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendientes.map(img => (
              <div key={img.id} className="border rounded-md p-2 space-y-2">
                {img.posibleReemplazoDeId ? (
                  <>
                    <p className="text-xs text-amber-800">Parece reemplazar una foto existente:</p>
                    <div className="flex items-center gap-2">
                      <div className="text-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.posibleReemplazoDeId}/contenido`}
                          alt="Foto actual"
                          className="h-16 w-16 object-cover rounded border bg-gray-50"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">Actual</p>
                      </div>
                      <span className="text-muted-foreground shrink-0">→</span>
                      <div className="text-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes/${img.id}/contenido`}
                          alt={img.nombreArchivo}
                          className="h-16 w-16 object-cover rounded border bg-gray-50"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">Nueva</p>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <Button
                          size="sm"
                          className="h-8 gap-1"
                          disabled={procesandoId === img.id}
                          onClick={() => handleReemplazar(img.id)}
                        >
                          {procesandoId === img.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Reemplazar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-red-500"
                          disabled={procesandoId === img.id}
                          onClick={() => handleDescartar(img.id)}
                        >
                          No — descartar
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/proyectos/${proyectoId}/plan-trabajo/imagenes-pendientes/${img.id}/contenido`}
                      alt={img.nombreArchivo}
                      className="h-16 w-16 object-cover rounded border shrink-0 bg-gray-50"
                    />
                    <select
                      className="flex-1 h-9 text-xs border rounded-md px-2 min-w-0"
                      value={seleccion[img.id] ?? ''}
                      onChange={e => setSeleccion(prev => ({ ...prev, [img.id]: e.target.value }))}
                    >
                      <option value="">Elegí la tarea...</option>
                      {opcionesTarea.map(op => (
                        <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-8 px-2 shrink-0"
                      disabled={procesandoId === img.id}
                      onClick={() => handleAsignar(img.id)}
                    >
                      {procesandoId === img.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 shrink-0"
                      disabled={procesandoId === img.id}
                      onClick={() => handleDescartar(img.id)}
                    >
                      <X size={13} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {pendientes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No quedan fotos pendientes.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionAbierta(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
