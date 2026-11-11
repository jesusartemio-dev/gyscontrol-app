'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronDown, ChevronRight, Camera, AlertCircle, Pencil, Hand, Check, Copy } from 'lucide-react'
import type { PlanTrabajo, PlanTrabajoImagen } from '@prisma/client'
import type { PlanTrabajoContexto, PlanAlcanceDetalladoEdt, SeccionRegenerable } from '@/types/planTrabajo'
import { Button } from '@/components/ui/button'
import { CampoFotoTarea } from './CampoFotoTarea'
import { SeccionCampoCard, BotonCopiar, EditarTextoDialog } from './SeccionesCampo'
import { seccionATexto, textoASeccion, edtATexto, SECCIONES_EDITABLES_TEXTO, type ResultadoTexto } from '@/lib/planTrabajo/textoSecciones'
import { NOMBRE_SECCION, leerEdiciones } from '@/lib/planTrabajo/edicionesManuales'
import { construirTextoParaIa } from '@/lib/planTrabajo/contextoIaAlcance'
import { DelCronogramaPanel } from '../CopiarParaIA'

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
type EdicionAlcance = (
  | { tipo: 'edt'; ei: number; titulo: string; texto: string }
  | { tipo: 'sub'; ei: number; si: number; titulo: string; texto: string }
  | { tipo: 'tarea'; ei: number; si: number; ti: number; titulo: string; texto: string }
) & {
  /** Identifica el ítem en la vista (marcas "Copiado" / "Guardado"). */
  clave: string
  /** Dónde está: "11.5 Tramo 3 › Armado de andamios › Tarea 2 de 6". */
  ubicacion: string
}

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
  // Marcas en la vista: qué ítem se copió por última vez y cuál se acaba de guardar.
  const [copiadoClave, setCopiadoClave] = useState<string | null>(null)
  const [guardadoClave, setGuardadoClave] = useState<string | null>(null)
  const marcarGuardado = (clave: string) => {
    setGuardadoClave(clave)
    setTimeout(() => setGuardadoClave((c) => (c === clave ? null : c)), 6000)
  }

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

  /**
   * Aplica un cambio de texto al Alcance Detallado (marcándolo como editado a
   * mano) y lo guarda. El cambio se aplica sobre lo guardado AHORA en el
   * servidor (buscando el EDT/actividad/tarea por su id), así no se pisa lo
   * que otra persona haya editado mientras tanto.
   */
  const guardarAlcance = async (ed: EdicionAlcance, valor: unknown) => {
    const texto = String(valor)
    const edtLocal = raw[ed.ei]
    const subLocal = ed.tipo !== 'edt' ? edtLocal.subItems?.[ed.si] : undefined
    const tareaLocal = ed.tipo === 'tarea' ? subLocal?.tareas?.[ed.ti] : undefined

    const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/contexto`)
    if (!res.ok) throw new Error(`No se pudo leer el plan actual (HTTP ${res.status})`)
    const { data } = await res.json()
    const actual = structuredClone((data?.planTrabajo?.alcanceDetallado ?? []) as PlanAlcanceDetalladoEdt[])
    const noEsta = () => new Error('Ese texto ya no está en el plan (alguien regeneró o cambió el alcance). Recargá la página.')

    const edt = actual.find(e => e.edtRefId && e.edtRefId === edtLocal.edtRefId)
    if (!edt) throw noEsta()
    if (ed.tipo === 'edt') {
      edt.descripcion = texto
      edt.descripcionEditadaManualmente = true
    } else {
      const sub = subLocal?.actividadRefId
        ? edt.subItems?.find(s => s.actividadRefId === subLocal.actividadRefId)
        : edt.subItems?.[ed.si]
      if (!sub) throw noEsta()
      if (ed.tipo === 'sub') {
        sub.descripcion = texto
        sub.descripcionEditadaManualmente = true
      } else {
        const tarea = sub.tareas?.find(t =>
          (tareaLocal?.tareaRefId && t.tareaRefId === tareaLocal.tareaRefId) ||
          (tareaLocal?.manualId && t.manualId === tareaLocal.manualId))
        if (!tarea) throw noEsta()
        tarea.texto = texto
        if (tarea.manualId) tarea.nombre = texto
        else tarea.textoEditadoManualmente = true
      }
    }
    await guardarSeccion('alcanceDetallado', actual)
  }

  const textoDe = (s: SeccionRegenerable) => seccionATexto(s, (plan as unknown as Record<string, unknown>)[s])

  return (
    <div className="max-w-3xl mx-auto py-2 sm:px-3 space-y-3 pb-24">
      <div className="mb-1">
        <h1 className="text-lg font-semibold text-gray-800">Plan de Trabajo — Modo Campo</h1>
        <p className="text-xs text-muted-foreground">
          Tocá &quot;Editar&quot; en cualquier texto: ahí lo copiás, lo mejorás donde quieras, lo pegás y guardás. Abajo, tocá tu zona y sacá la foto de cada tarea.
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
                <div className="px-3 py-2.5">
                  <TextoEditable
                    texto={item.descripcion}
                    editado={item.descripcionEditadaManualmente}
                    copiado={copiadoClave === `${ei}`}
                    guardado={guardadoClave === `${ei}`}
                    className="text-[13px] text-gray-700"
                    onEditar={() => setEditandoAlcance({
                      tipo: 'edt', ei, clave: `${ei}`,
                      ubicacion: `${item.numeracion} ${item.edtNombre}`,
                      titulo: 'Descripción del EDT', texto: item.descripcion,
                    })}
                  />
                </div>
                {(item.subItems ?? []).map((sub, si) => {
                  const tareas = (sub.tareas ?? []).map((t, ti) => ({ t, ti })).filter(({ t }) => !t.excluida)
                  const ubicSub = `${item.numeracion} ${item.edtNombre} › ${sub.actividadNombre}`
                  return (
                    <div key={si} className="px-3 py-3 space-y-3 bg-gray-50/50">
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">{sub.actividadNombre}</p>
                      <TextoEditable
                        texto={sub.descripcion}
                        editado={sub.descripcionEditadaManualmente}
                        copiado={copiadoClave === `${ei}-${si}`}
                        guardado={guardadoClave === `${ei}-${si}`}
                        className="text-[12px] text-gray-600"
                        onEditar={() => setEditandoAlcance({
                          tipo: 'sub', ei, si, clave: `${ei}-${si}`, ubicacion: ubicSub,
                          titulo: 'Descripción de la actividad', texto: sub.descripcion,
                        })}
                      />
                      {tareas.map(({ t: tarea, ti }, pos) => (
                        <div key={tarea.tareaRefId ?? tarea.manualId ?? ti} className="bg-white border rounded-md p-2.5 space-y-2">
                          <TextoEditable
                            texto={tarea.texto || tarea.nombre}
                            editado={tarea.textoEditadoManualmente}
                            copiado={copiadoClave === `${ei}-${si}-${ti}`}
                            guardado={guardadoClave === `${ei}-${si}-${ti}`}
                            className="text-sm text-gray-800 leading-snug"
                            onEditar={() => setEditandoAlcance({
                              tipo: 'tarea', ei, si, ti, clave: `${ei}-${si}-${ti}`,
                              ubicacion: `${ubicSub} › Tarea ${pos + 1} de ${tareas.length}`,
                              titulo: tarea.nombre, texto: tarea.texto || tarea.nombre,
                            })}
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
          ubicacion={editandoAlcance.ubicacion}
          ayuda={editandoAlcance.tipo === 'tarea' ? 'Una viñeta de una línea.' : 'Mínimo 60 caracteres.'}
          textoInicial={editandoAlcance.texto}
          unaLinea={editandoAlcance.tipo === 'tarea'}
          interpretar={editandoAlcance.tipo === 'tarea' ? interpretarVineta : interpretarDescripcion}
          onCopiado={() => setCopiadoClave(editandoAlcance.clave)}
          arriba={<DelCronogramaPanel contexto={contexto} edtRefId={raw[editandoAlcance.ei]?.edtRefId} />}
          textoParaIA={(textoActual) => {
            // El EDT tal como está guardado, con el texto que se está editando ahora.
            const e = editandoAlcance
            const item = structuredClone(raw[e.ei])
            if (e.tipo === 'edt') item.descripcion = textoActual
            else if (e.tipo === 'sub' && item.subItems?.[e.si]) item.subItems[e.si].descripcion = textoActual
            else if (e.tipo === 'tarea' && item.subItems?.[e.si]?.tareas?.[e.ti]) item.subItems[e.si].tareas![e.ti].texto = textoActual
            return construirTextoParaIa({
              contexto, item,
              objetivo: e.tipo === 'edt' ? { tipo: 'edt' } : e.tipo === 'sub' ? { tipo: 'actividad', si: e.si } : { tipo: 'tarea', si: e.si, ti: e.ti },
            })
          }}
          onGuardar={async (v) => {
            await guardarAlcance(editandoAlcance, v)
            marcarGuardado(editandoAlcance.clave)
          }}
        />
      )}
    </div>
  )
}

/**
 * Texto del Alcance Detallado con un solo botón "Editar": Copiar/Pegar viven
 * dentro del diálogo (se ve qué ítem es y el antes/después antes de guardar).
 * Marcas: editado a mano, el último copiado y el recién guardado.
 */
function TextoEditable({ texto, editado, copiado, guardado, className, onEditar }: {
  texto: string
  editado?: boolean
  copiado?: boolean
  guardado?: boolean
  className?: string
  onEditar: () => void
}) {
  return (
    <div className={`-mx-1.5 space-y-1.5 rounded-md px-1.5 py-1 transition-colors ${
      guardado ? 'bg-emerald-50 ring-1 ring-emerald-300' : copiado ? 'bg-sky-50 ring-1 ring-sky-200' : ''
    }`}>
      <p className={`whitespace-pre-wrap ${className ?? ''}`}>
        {texto}
        {editado && <Hand className="ml-1 inline h-3 w-3 text-amber-600" aria-label="Editado a mano" />}
      </p>
      <div className="flex items-center justify-end gap-2">
        {guardado && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <Check className="h-3 w-3" /> Guardado
          </span>
        )}
        {!guardado && copiado && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">
            <Copy className="h-3 w-3" /> Copiado
          </span>
        )}
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-[11px]" onClick={onEditar}>
          <Pencil className="h-3 w-3" />
          Editar
        </Button>
      </div>
    </div>
  )
}
