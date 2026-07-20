'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, Camera, AlertCircle } from 'lucide-react'
import type { PlanTrabajo, PlanTrabajoImagen } from '@prisma/client'
import type { PlanTrabajoContexto, PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'
import { CampoFotoTarea } from './CampoFotoTarea'

interface Props {
  proyectoId: string
}

/**
 * Vista de Campo del Plan de Trabajo — pantalla dedicada para que el
 * personal en obra tome fotos de sus tareas desde el celular. A propósito
 * NO reusa PlanTrabajoClient.tsx (esa es la herramienta de oficina: editar,
 * reordenar, borrar tareas, confirmar sugerencias de IA) — acá no hay
 * NINGÚN control de edición, solo lectura de la estructura + captura de
 * fotos vía CampoFotoTarea (mismo endpoint que usa el editor de oficina,
 * GaleriaImagenesAlcance.tsx, sin duplicar lógica de negocio).
 *
 * Solo se muestran los EDTs de tipoDetalle='detallado' (Construcción/
 * Comisionamiento) — son los únicos con tareas reales y fotos; el resto
 * (Gestión, Ingeniería...) no aplica a esta vista.
 */
export function PlanTrabajoCampoClient({ proyectoId }: Props) {
  const [contexto, setContexto] = useState<PlanTrabajoContexto | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())

  const fetchContexto = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/contexto`)
      if (res.ok) {
        const { data } = await res.json()
        setContexto(data)
      } else {
        const body = await res.json().catch(() => ({}))
        setErrorAcceso(body.error ?? `Error ${res.status}`)
      }
    } catch {
      setErrorAcceso('No se pudo cargar el Plan de Trabajo')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => { fetchContexto() }, [fetchContexto])

  const toggle = (i: number) => {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (errorAcceso) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-muted-foreground max-w-sm">{errorAcceso}</p>
      </div>
    )
  }

  const plan = contexto?.planTrabajo as (PlanTrabajo & { imagenes: PlanTrabajoImagen[] }) | null | undefined
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <Camera className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Este proyecto todavía no tiene un Plan de Trabajo generado — pedile a tu supervisor que lo genere primero.
        </p>
      </div>
    )
  }

  const raw = (plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []
  const edtsDetallados = raw.filter(item => item.tipoDetalle === 'detallado' && item.edtRefId)

  if (edtsDetallados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <Camera className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Este proyecto todavía no tiene actividades de Construcción/Comisionamiento en el Plan de Trabajo.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-3 pb-24">
      <div className="mb-1">
        <h1 className="text-lg font-semibold text-gray-800">Plan de Trabajo — Modo Campo</h1>
        <p className="text-xs text-muted-foreground">Tocá tu zona y sacá la foto de cada tarea.</p>
      </div>

      {edtsDetallados.map((item, edtIdx) => {
        const abierto = abiertos.has(edtIdx)
        const tareasDelEdt = (item.subItems ?? []).flatMap(sub => (sub.tareas ?? []).filter(t => !t.excluida).map(tarea => ({ sub, tarea })))
        const sinFoto = tareasDelEdt.filter(
          ({ tarea }) => !plan.imagenes.some(img => img.edtRef === item.edtRefId && img.tareaRef === tarea.tareaRefId)
        ).length

        return (
          <div key={edtIdx} className="border rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => toggle(edtIdx)}
              className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-gray-50 transition"
            >
              {abierto ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.edtNombre}</p>
                {item.ubicacion && <p className="text-[11px] text-muted-foreground truncate">📍 {item.ubicacion}</p>}
              </div>
              {sinFoto > 0 && (
                <span className="shrink-0 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  {sinFoto} sin foto
                </span>
              )}
            </button>

            {abierto && (
              <div className="border-t divide-y">
                {(item.subItems ?? []).map((sub, subIdx) => {
                  const tareasVisibles = (sub.tareas ?? []).filter(t => !t.excluida)
                  if (tareasVisibles.length === 0) return null
                  return (
                    <div key={subIdx} className="px-3 py-3 space-y-3 bg-gray-50/50">
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">{sub.actividadNombre}</p>
                      {tareasVisibles.map((tarea, tareaIdx) => (
                        <div key={tarea.tareaRefId ?? tareaIdx} className="bg-white border rounded-md p-2.5 space-y-2">
                          <p className="text-sm text-gray-800 leading-snug">{tarea.texto || tarea.nombre}</p>
                          {tarea.tareaRefId && (
                            <CampoFotoTarea
                              proyectoId={proyectoId}
                              edtRef={item.edtRefId ?? ''}
                              tareaRef={tarea.tareaRefId}
                              nombreDefault={tarea.texto || tarea.nombre}
                              imagenes={plan.imagenes}
                              onChanged={fetchContexto}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
