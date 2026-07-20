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
}

interface OpcionTarea {
  valor: string // `${edtRef}::${tareaRef}`
  etiqueta: string
}

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

      // Paso 2: el navegador sube el archivo DIRECTO a Google Drive.
      const resDrive = await fetch(sesion.sessionUri, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!resDrive.ok) {
        throw new Error('No se pudo subir el archivo a Drive')
      }
      const driveFile = await resDrive.json()

      // Paso 3: nuestro servidor descarga de Drive y procesa (JSON chico, sin el archivo).
      const resCompletar = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/subir-version/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFileId: driveFile.id,
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
          ? `Versión subida. ${data.imagenesNuevasPendientes} foto(s) nueva(s) para revisar.`
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
            {pendientes.length} foto{pendientes.length > 1 ? 's' : ''} nueva{pendientes.length > 1 ? 's' : ''} de la versión subida — asignalas a su tarea.
          </span>
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 shrink-0 bg-white" onClick={() => setRevisionAbierta(true)}>
            Revisar
          </Button>
        </div>
      )}

      <Dialog open={revisionAbierta} onOpenChange={setRevisionAbierta}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fotos nuevas — asignar a una tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendientes.map(img => (
              <div key={img.id} className="flex items-center gap-3 border rounded-md p-2">
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
