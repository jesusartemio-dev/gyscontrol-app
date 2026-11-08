'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, Camera, AlertCircle, Pencil, Hand } from 'lucide-react'
import type { PlanTrabajo, PlanTrabajoImagen } from '@prisma/client'
import type { PlanTrabajoContexto, PlanAlcanceDetalladoEdt, SeccionRegenerable } from '@/types/planTrabajo'
import { Button } from '@/components/ui/button'
import { CampoFotoTarea } from './CampoFotoTarea'
import { SeccionCampoCard, BotonCopiar, EditarTextoDialog } from './SeccionesCampo'
import { seccionATexto, textoASeccion, edtATexto, SECCIONES_EDITABLES_TEXTO, type ResultadoTexto } from '@/lib/planTrabajo/textoSecciones'
import { NOMBRE_SECCION, leerEdiciones } from '@/lib/planTrabajo/edicionesManuales'

interface Props {
  proyectoId: string
}

/** Secciones que se muestran en campo, en el orden del documento. */
const SECCIONES_CAMPO: SeccionRegenerable[] = [
  'objetivo', 'alcanceGeneral', 'eppRequeridos', 'herramientasYEquipos', 'restricciones',
  'personalAsignado', 'matrizRaci', 'histogramas', 'cronogramaResumen', 'referencias',
]

const AYUDA_EDICION: Partial<Record<SeccionRegenerable, string>> = {
  objetivo: 'Pegá o escribí el texto completo del objetivo.',
  alcanceGeneral: 'Pegá o escribí el texto completo del alcance general.',
  restricciones: 'Una restricción por línea.',
  eppRequeridos: 'Grupos BÁSICO, BIOSEGURIDAD y RIESGO ESPECÍFICO. Un EPP por línea: "- nombre | norma".',
  herramientasYEquipos: 'Grupos EQUIPOS, HERRAMIENTAS y MATERIALES. Un ítem por línea: "- nombre | 2 und | observaciones".',
}

/** Qué se está editando del Alcance Detallado (índices sobre el arreglo completo). */
type EdicionAlcance =
  | { tipo: 'edt'; ei: number; titulo: string; texto: string }
  | { tipo: 'sub'; ei: number; si: number; titulo: string; texto: string }
  | { tipo: 'tarea'; ei: number; si: number; ti: number; titulo: string; texto: string }

const interpretarDescripcion = (texto: string): ResultadoTexto<unknown> => {
  const t = texto.trim()
  if (t.length < 60) return { error: `La descripción debe tener al menos 60 caracteres (tiene ${t.length}).`, resumen: '' }
  return { valor: t, resumen: `${t.length} caracteres` }
}
const interpretarVineta = (texto: string): ResultadoTexto<unknown> => {
  const t = texto.replace(/\s+/g, ' ').trim()
  if (!t) return { error: 'El texto está vacío.', resumen: '' }
  return { valor: t, resumen: `${t.length} caracteres` }
}

/**
 * Vista de Campo del Plan de Trabajo — para celular o tablet en obra:
 *  - Secciones del plan: cada una se copia al portapapeles y las de texto
 *    (objetivo, alcance general, EPP, herramientas, restricciones) se editan
 *    pegando el texto corregido. Las tablas calculadas solo se copian.
 *  - Zonas (EDTs de Construcción/Comisionamiento): fotos de cada tarea, copiar
 *    el EDT y editar sus descripciones y viñetas.
 * Lo editado acá queda marcado como editado a mano (lo respeta una regeneración).
 * La herramienta de oficina (regenerar, reordenar, excluir tareas, confirmar
 * sugerencias de IA) sigue siendo PlanTrabajoClient.
 */
export function PlanTrabajoCampoClient({ proyectoId }: Props) {
  const [contexto, setContexto] = useState<PlanTrabajoContexto | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())
  const [editandoAlcance, setEditandoAlcance] = useState<EdicionAlcance | null>(null)

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

  /** Guarda una sección (PATCH): queda marcada como editada a mano. */
  const guardarSeccion = useCallback(async (seccion: string, valor: unknown) => {
    const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [seccion]: valor }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error((e as { error?: string }).error ?? `No se pudo guardar (HTTP ${res.status})`)
    }
    await fetchContexto()
  }, [proyectoId, fetchContexto])

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

  const ediciones = leerEdiciones((plan as { seccionesEditadas?: unknown }).seccionesEditadas)
  const raw = (plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []
  // Con su índice en el arreglo completo, para guardar el cambio en el lugar correcto.
  const edtsDetallados = raw
    .map((item, ei) => ({ item, ei }))
    .filter(({ item }) => item.tipoDetalle === 'detallado' && item.edtRefId)

  /** Aplica un cambio de texto al Alcance Detallado (marcándolo como editado a mano) y lo guarda. */
  const guardarAlcance = async (ed: EdicionAlcance, valor: unknown) => {
    const copia = structuredClone(raw) as PlanAlcanceDetalladoEdt[]
    const edt = copia[ed.ei]
    if (ed.tipo === 'edt') {
      edt.descripcion = String(valor)
      edt.descripcionEditadaManualmente = true
    } else {
      const sub = edt.subItems![ed.si]
      if (ed.tipo === 'sub') {
        sub.descripcion = String(valor)
        sub.descripcionEditadaManualmente = true
      } else {
        const tarea = sub.tareas![ed.ti]
        tarea.texto = String(valor)
        tarea.textoEditadoManualmente = true
      }
    }
    await guardarSeccion('alcanceDetallado', copia)
  }

  const textoDe = (s: SeccionRegenerable) => seccionATexto(s, (plan as unknown as Record<string, unknown>)[s])

  return (
    <div className="max-w-lg mx-auto px-3 py-4 space-y-3 pb-24">
      <div className="mb-1">
        <h1 className="text-lg font-semibold text-gray-800">Plan de Trabajo — Modo Campo</h1>
        <p className="text-xs text-muted-foreground">
          Copiá una sección, corregila donde te sea cómodo y pegala con el lápiz. Abajo, tocá tu zona y sacá la foto de cada tarea.
        </p>
      </div>

      {/* ─── Secciones del plan ─── */}
      <h2 className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones del plan</h2>
      {SECCIONES_CAMPO.map((s) => {
        const editable = (SECCIONES_EDITABLES_TEXTO as readonly string[]).includes(s)
        return (
          <SeccionCampoCard
            key={s}
            titulo={NOMBRE_SECCION[s]}
            texto={textoDe(s)}
            editada={!!ediciones[s]}
            ayudaEdicion={AYUDA_EDICION[s]}
            interpretar={editable ? (t) => textoASeccion(s, t, (plan as unknown as Record<string, unknown>)[s]) : undefined}
            onGuardar={editable ? (v) => guardarSeccion(s, v) : undefined}
          />
        )
      })}

      {/* ─── Zonas: tareas con foto ─── */}
      <h2 className="pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alcance por zona · fotos</h2>
      {edtsDetallados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-white px-4 py-6 text-center">
          <Camera className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Este proyecto todavía no tiene actividades de Construcción/Comisionamiento en el Plan de Trabajo.
          </p>
        </div>
      ) : edtsDetallados.map(({ item, ei }) => {
        const abierto = abiertos.has(ei)
        const tareasDelEdt = (item.subItems ?? []).flatMap(sub => (sub.tareas ?? []).filter(t => !t.excluida).map(tarea => ({ sub, tarea })))
        const sinFoto = tareasDelEdt.filter(
          ({ tarea }) => !plan.imagenes.some(img => img.edtRef === item.edtRefId && img.tareaRef === tarea.tareaRefId)
        ).length

        return (
          <div key={ei} className="border rounded-lg overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-3 py-3">
              <button
                type="button"
                onClick={() => toggle(ei)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {abierto ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.edtNombre}</p>
                  {item.ubicacion && <p className="text-[11px] text-muted-foreground truncate">📍 {item.ubicacion}</p>}
                </div>
              </button>
              {sinFoto > 0 && (
                <span className="shrink-0 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  {sinFoto} sin foto
                </span>
              )}
              <BotonCopiar texto={edtATexto(item)} compacto />
            </div>

            {abierto && (
              <div className="border-t divide-y">
                {/* Descripción del EDT */}
                <TextoEditable
                  texto={item.descripcion}
                  editado={item.descripcionEditadaManualmente}
                  className="px-3 py-2.5 text-[13px] text-gray-700"
                  onEditar={() => setEditandoAlcance({ tipo: 'edt', ei, titulo: `Descripción de ${item.edtNombre}`, texto: item.descripcion })}
                />
                {(item.subItems ?? []).map((sub, si) => {
                  const tareas = (sub.tareas ?? []).map((t, ti) => ({ t, ti })).filter(({ t }) => !t.excluida)
                  return (
                    <div key={si} className="px-3 py-3 space-y-3 bg-gray-50/50">
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">{sub.actividadNombre}</p>
                      <TextoEditable
                        texto={sub.descripcion}
                        editado={sub.descripcionEditadaManualmente}
                        className="text-[12px] text-gray-600"
                        onEditar={() => setEditandoAlcance({ tipo: 'sub', ei, si, titulo: `Descripción de ${sub.actividadNombre}`, texto: sub.descripcion })}
                      />
                      {tareas.map(({ t: tarea, ti }) => (
                        <div key={tarea.tareaRefId ?? tarea.manualId ?? ti} className="bg-white border rounded-md p-2.5 space-y-2">
                          <TextoEditable
                            texto={tarea.texto || tarea.nombre}
                            editado={tarea.textoEditadoManualmente}
                            className="text-sm text-gray-800 leading-snug"
                            onEditar={() => setEditandoAlcance({ tipo: 'tarea', ei, si, ti, titulo: tarea.nombre, texto: tarea.texto || tarea.nombre })}
                          />
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

      {editandoAlcance && (
        <EditarTextoDialog
          open
          onOpenChange={(o) => { if (!o) setEditandoAlcance(null) }}
          titulo={editandoAlcance.titulo}
          ayuda={editandoAlcance.tipo === 'tarea' ? 'Una viñeta de una línea.' : 'Mínimo 60 caracteres.'}
          textoInicial={editandoAlcance.texto}
          interpretar={editandoAlcance.tipo === 'tarea' ? interpretarVineta : interpretarDescripcion}
          onGuardar={(v) => guardarAlcance(editandoAlcance, v)}
        />
      )}
    </div>
  )
}

/** Texto del Alcance Detallado con su lápiz para editarlo (y la marca si ya se editó a mano). */
function TextoEditable({ texto, editado, className, onEditar }: { texto: string; editado?: boolean; className?: string; onEditar: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <p className={`min-w-0 flex-1 whitespace-pre-wrap ${className ?? ''}`}>
        {texto}
        {editado && <Hand className="ml-1 inline h-3 w-3 text-amber-600" aria-label="Editado a mano" />}
      </p>
      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 text-muted-foreground" title="Editar" onClick={onEditar}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
