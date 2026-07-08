'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, BookOpen, Plus, Sparkles, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

import type { PlanTrabajoContexto, SeccionRegenerable } from '@/types/planTrabajo'
import type { PlanTrabajo } from '@prisma/client'

import { PreRequisitosPanel } from './PreRequisitosPanel'
import { CabeceraEditor } from './CabeceraEditor'
import { TogglesPanel } from './TogglesPanel'
import { BotonCalcularDatos } from './BotonCalcularDatos'
import { BotonGenerarIA } from './BotonGenerarIA'
import { BotonExportarDocx } from './BotonExportarDocx'
import { BotonEliminarPlan } from './BotonEliminarPlan'
import { HistorialGeneraciones } from './HistorialGeneraciones'
import { SeccionContainer } from './SeccionContainer'
import { SECCIONES_ETAPA_1, esSeccionEtapa1, etapa1Completa, algunaSeccionEtapa2Completa } from '@/lib/planTrabajo/etapas'

import { ObjetivoView } from './secciones/ObjetivoView'
import { AlcanceGeneralView } from './secciones/AlcanceGeneralView'
import { AlcanceDetalladoView } from './secciones/AlcanceDetalladoView'
import { EppRequeridosView } from './secciones/EppRequeridosView'
import { HerramientasView } from './secciones/HerramientasView'
import { RestriccionesView } from './secciones/RestriccionesView'
import { PersonalAsignadoView } from './secciones/PersonalAsignadoView'
import { MatrizRaciView } from './secciones/MatrizRaciView'
import { HistogramasView } from './secciones/HistogramasView'
import { CronogramaResumenView } from './secciones/CronogramaResumenView'
import { ResponsabilidadesView } from './secciones/ResponsabilidadesView'
import { ReferenciasView } from './secciones/ReferenciasView'

import { ObjetivoEditor } from './editores/ObjetivoEditor'
import { AlcanceGeneralEditor } from './editores/AlcanceGeneralEditor'
import { AlcanceDetalladoEditor } from './editores/AlcanceDetalladoEditor'
import { EppRequeridosEditor } from './editores/EppRequeridosEditor'
import { HerramientasEditor } from './editores/HerramientasEditor'
import { RestriccionesEditor } from './editores/RestriccionesEditor'
import { PersonalAsignadoEditor } from './editores/PersonalAsignadoEditor'
import { ReferenciasEditor } from './editores/ReferenciasEditor'
import { CronogramaResumenEditor } from './editores/CronogramaResumenEditor'
import { ResponsabilidadesEditor } from './editores/ResponsabilidadesEditor'
import { HistogramasEditor } from './editores/HistogramasEditor'
import { MatrizRaciEditor } from './editores/MatrizRaciEditor'

import type {
  PlanAlcanceDetalladoEdt,
  PlanEPP,
  PlanHerramientasYEquipos,
  PlanRestriccion,
  PlanPersonal,
  PlanReferencia,
  PlanCronograma,
  PlanResponsabilidades,
  PlanHistogramas,
  PlanRaci,
} from '@/types/planTrabajo'

interface Props {
  proyectoId: string
}

function parseSSEPart(part: string): { event: string; data: Record<string, unknown> } | null {
  const lines = part.split('\n')
  let event = ''
  let dataStr = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
  }
  if (!event || !dataStr) return null
  try { return { event, data: JSON.parse(dataStr) } }
  catch { return null }
}

async function readSSEStream(
  res: Response,
  onStatus: (msg: string, progreso?: number) => void,
  onDone: (data: Record<string, unknown>) => Promise<void>,
  onSeccion?: (id: string) => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneCalled = false

  const abortHandler = () => reader.cancel().catch(() => {})
  signal?.addEventListener('abort', abortHandler)

  const procesarPart = async (part: string) => {
    const parsed = parseSSEPart(part)
    if (!parsed) return
    const { event, data } = parsed
    if (event === 'status') onStatus(String(data.mensaje ?? ''), typeof data.progreso === 'number' ? data.progreso : undefined)
    else if (event === 'seccion') { if (onSeccion) await onSeccion(String(data.id ?? '')) }
    else if (event === 'seccion-error') {
      const id = String(data.id ?? '')
      const motivo = String(data.motivo ?? 'error desconocido')
      console.warn(`[IA] Sección ${id} falló: ${motivo}`)
      toast.warning(`Sección "${id}" no se pudo generar: ${motivo.slice(0, 120)}`)
    }
    else if (event === 'done') { doneCalled = true; await onDone(data) }
    else if (event === 'error') throw new Error(String(data.mensaje ?? 'Error interno'))
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        // Flush decoder y procesar cualquier dato restante en el buffer
        buffer += decoder.decode()
        if (buffer.trim()) await procesarPart(buffer)
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()!
      for (const part of parts) await procesarPart(part)
    }
  } catch (err) {
    if (signal?.aborted) return
    throw err
  } finally {
    signal?.removeEventListener('abort', abortHandler)
  }

  if (!doneCalled && !signal?.aborted) {
    throw new Error('La generación finalizó sin respuesta — revisá los logs del servidor')
  }
}

type SeccionEditable =
  | 'objetivo'
  | 'alcanceGeneral'
  | 'alcanceDetallado'
  | 'eppRequeridos'
  | 'herramientasYEquipos'
  | 'restricciones'
  | 'personalAsignado'
  | 'referencias'
  | 'cronogramaResumen'
  | 'responsabilidades'
  | 'histogramas'
  | 'matrizRaci'

export function PlanTrabajoClient({ proyectoId }: Props) {
  const [contexto, setContexto] = useState<PlanTrabajoContexto | null>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [generandoTodo, setGenerandoTodo] = useState(false)
  const [mensajeGenerar, setMensajeGenerar] = useState('')
  const [regenerando, setRegenerando] = useState<SeccionRegenerable | null>(null)
  const [mensajeRegen, setMensajeRegen] = useState('')
  const [editandoSeccion, setEditandoSeccion] = useState<SeccionEditable | null>(null)
  const [recienCreado, setRecienCreado] = useState(false)
  const [progresoGenerar, setProgresoGenerar] = useState(0)
  const [errorGeneracion, setErrorGeneracion] = useState<{ mensaje: string } | null>(null)
  const [confirmandoRegenerar, setConfirmandoRegenerar] = useState(false)
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  const handleCrear = async () => {
    setCreando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, { method: 'POST' })
      if (res.ok || res.status === 409) {
        await fetchContexto()
        setRecienCreado(true)
        toast.success('Plan de Trabajo creado')
      } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e.error ?? 'Error al crear Plan de Trabajo')
      }
    } finally {
      setCreando(false)
    }
  }

  const handleCancelar = () => {
    abortRef.current?.abort()
  }

  // Etapa 1: calcula personalAsignado/matrizRaci/histogramas/cronogramaResumen/
  // referencias directo de BD, sin IA. Devuelve true si terminó sin error.
  const handleCalcularDatos = async (): Promise<boolean> => {
    if (!contexto?.prerrequisitos.puedeGenerar) {
      const faltantes = contexto?.prerrequisitos.bloqueantesFaltantes ?? []
      toast.error(
        faltantes.length > 0
          ? `Faltan prerrequisitos: ${faltantes.join(' · ')}`
          : 'Completá los prerrequisitos antes de calcular',
        { duration: 6000 }
      )
      return false
    }
    setCalculando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/calcular-datos`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? 'Error al calcular los datos')
      }
      await fetchContexto()
      const advertencias = (body.advertencias as string[] | undefined) ?? []
      if (advertencias.length > 0) {
        toast.warning(
          `Datos calculados con ${advertencias.length} advertencia(s): ${advertencias.slice(0, 2).join(' · ')}${advertencias.length > 2 ? '…' : ''}`,
          { duration: 8000 }
        )
      } else {
        toast.success('Datos calculados: personal, RACI, histogramas, cronograma y referencias')
      }
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al calcular los datos')
      return false
    } finally {
      setCalculando(false)
    }
  }

  const iniciarGeneracion = async () => {
    setConfirmandoRegenerar(false)
    setRecienCreado(false)
    setErrorGeneracion(null)
    setProgresoGenerar(0)
    setGenerando(true)
    setMensajeGenerar('Iniciando...')
    const abort = new AbortController()
    abortRef.current = abort
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/generar-ia`, {
        method: 'POST',
        signal: abort.signal,
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error((e as { error?: string }).error ?? 'Error al iniciar generación')
      }
      await readSSEStream(
        res,
        (msg, progreso) => {
          setMensajeGenerar(msg)
          if (progreso !== undefined) setProgresoGenerar(progreso)
        },
        async (data) => {
          setProgresoGenerar(100)
          await fetchContexto()
          const guardadas = (data.seccionesGuardadas as string[] | undefined) ?? []
          const conError = (data.seccionesConError as string[] | undefined) ?? []
          const cancelado = data.cancelado === true
          if (cancelado) {
            toast.info(`Generación cancelada. ${guardadas.length} secciones guardadas.`)
          } else if (conError.length > 0) {
            toast.warning(`${guardadas.length} secciones guardadas. ${conError.length} con error: ${conError.join(', ')}`)
          } else {
            toast.success(`Plan generado: ${guardadas.length} secciones guardadas`)
          }
        },
        async () => { await fetchContexto() },
        abort.signal
      )
    } catch (err) {
      if (abort.signal.aborted) {
        toast.info('Generación cancelada')
        return
      }
      const mensaje = err instanceof Error ? err.message : 'Error al generar el Plan de Trabajo'
      setErrorGeneracion({ mensaje })
    } finally {
      abortRef.current = null
      setGenerando(false)
      setMensajeGenerar('')
    }
  }

  const handleGenerar = async () => {
    if (!contexto?.prerrequisitos.puedeGenerar) {
      const faltantes = contexto?.prerrequisitos.bloqueantesFaltantes ?? []
      toast.error(
        faltantes.length > 0
          ? `Faltan prerrequisitos: ${faltantes.join(' · ')}`
          : 'Completá los prerrequisitos antes de generar',
        { duration: 6000 }
      )
      return
    }
    const bloquesActuales = (contexto?.planTrabajo as Record<string, unknown>)?.bloquesCompletitud as Record<string, boolean> | undefined
    if (!etapa1Completa(bloquesActuales)) {
      toast.error('Completá primero "1. Generar datos" — el prompt de IA necesita el personal y las horas ya calculados.', { duration: 6000 })
      return
    }
    // Si ya hay secciones de Etapa 2 redactadas, pedir confirmación antes de sobreescribir
    if (algunaSeccionEtapa2Completa(bloquesActuales)) {
      setConfirmandoRegenerar(true)
      return
    }
    await iniciarGeneracion()
  }

  // "Generar todo": Etapa 1 → Etapa 2 encadenado.
  const handleGenerarTodo = async () => {
    setGenerandoTodo(true)
    try {
      const ok = await handleCalcularDatos()
      if (!ok) return
      await iniciarGeneracion()
    } finally {
      setGenerandoTodo(false)
    }
  }

  const handleRegen = async (seccion: SeccionRegenerable, instruccionesAdicionales?: string) => {
    setRegenerando(seccion)
    setMensajeRegen('Iniciando...')
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/regenerar-seccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seccion, instruccionesAdicionales }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al regenerar')
      }
      await readSSEStream(
        res,
        (msg) => setMensajeRegen(msg),
        async (data) => {
          await fetchContexto()
          const advertencias = (data.advertencias as string[] | undefined) ?? []
          const calculado = data.calculado === true
          if (advertencias.length > 0) {
            toast.warning(
              `Sección "${seccion}" recalculada con advertencias: ${advertencias.slice(0, 2).join(' · ')}${advertencias.length > 2 ? '…' : ''}`,
              { duration: 8000 }
            )
          } else {
            toast.success(`Sección "${seccion}" ${calculado ? 'recalculada' : 'regenerada'}`)
          }
        }
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al regenerar')
    } finally {
      setRegenerando(null)
      setMensajeRegen('')
    }
  }

  const handleSaveSeccion = async (seccion: SeccionEditable, valor: unknown) => {
    const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [seccion]: valor }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error ?? `HTTP ${res.status}`)
    }
    await fetchContexto()
    setEditandoSeccion(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  if (errorAcceso) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">{errorAcceso}</p>
      </div>
    )
  }

  if (!contexto) return null

  const { prerrequisitos, planTrabajo, iaPlanTrabajoHabilitada } = contexto

  if (!planTrabajo) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[480px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <div className="p-4 rounded-full bg-rose-50">
            <BookOpen className="text-rose-500" size={36} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Plan de Trabajo</h2>
          <p className="text-sm text-muted-foreground">
            Inicializá el Plan de Trabajo para este proyecto. Podrás generar todas sus
            secciones con IA una vez creado.
          </p>
        </div>
        <PreRequisitosPanel prerrequisitos={prerrequisitos} compact />
        <Button onClick={handleCrear} disabled={creando} className="bg-rose-600 hover:bg-rose-700 text-white">
          {creando
            ? <><Loader2 className="animate-spin mr-2" size={14} />Creando...</>
            : <><Plus size={14} className="mr-2" />Crear Plan de Trabajo</>}
        </Button>
      </div>
    )
  }

  const plan = planTrabajo as PlanTrabajo & { generaciones: unknown[]; operacionIAEnCurso?: string | null; operacionIAIniciadaEn?: Date | null }
  const bloques = (plan.bloquesCompletitud ?? {}) as Record<string, boolean>
  const LOCK_EXPIRY_MS = 10 * 60 * 1000
  const lockAge = plan.operacionIAIniciadaEn ? Date.now() - new Date(plan.operacionIAIniciadaEn).getTime() : Infinity
  const iaOcupada = !!plan.operacionIAEnCurso && lockAge < LOCK_EXPIRY_MS

  function minutosTranscurridos(fecha: Date | null | undefined): number {
    if (!fecha) return 0
    return Math.round((Date.now() - new Date(fecha).getTime()) / 60000)
  }

  const seccionesEtapa2Completas = Object.entries(bloques).filter(([k, v]) => v && !esSeccionEtapa1(k as SeccionRegenerable) && k !== 'responsabilidades').length

  return (
    <div className="space-y-4 p-4">
      {confirmandoRegenerar && (
        <Dialog open onOpenChange={() => setConfirmandoRegenerar(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={18} />
                ¿Redactar todo de nuevo con IA?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed pt-1">
                Ya tenés <strong>{seccionesEtapa2Completas} sección{seccionesEtapa2Completas !== 1 ? 'es' : ''} redactada{seccionesEtapa2Completas !== 1 ? 's' : ''}</strong> con IA.
                Si redactás todo de nuevo, el contenido existente será sobreescrito.
                <br /><br />
                Para actualizar solo una sección usá el botón <span className="font-mono">↻</span> en cada sección individualmente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmandoRegenerar(false)}>
                Cancelar
              </Button>
              <Button
                onClick={iniciarGeneracion}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Sí, regenerar todo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {errorGeneracion && (
        <Dialog open onOpenChange={() => setErrorGeneracion(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={18} />
                Error al generar el Plan de Trabajo
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed pt-1">
                {errorGeneracion.mensaje}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setErrorGeneracion(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => { setErrorGeneracion(null); handleGenerar() }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Reintentar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <PreRequisitosPanel prerrequisitos={prerrequisitos} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CabeceraEditor proyectoId={proyectoId} plan={plan} onUpdated={fetchContexto} />
        <TogglesPanel proyectoId={proyectoId} plan={plan} onUpdated={fetchContexto} />
      </div>

      {recienCreado && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <Sparkles size={16} className="text-indigo-500 shrink-0" />
          <span>
            <strong>¡Plan creado!</strong> Ahora hacé click en <strong>Generar con IA</strong> para rellenar todas las secciones automáticamente.
          </span>
          <button onClick={() => setRecienCreado(false)} className="ml-auto text-indigo-300 hover:text-indigo-500 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <BotonCalcularDatos
            puedeGenerar={prerrequisitos.puedeGenerar}
            calculando={calculando}
            disabled={generando || generandoTodo || !!iaOcupada}
            destacar={recienCreado}
            onCalcular={async () => { await handleCalcularDatos() }}
          />
          <BotonGenerarIA
            puedeGenerar={prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
            iaHabilitada={iaPlanTrabajoHabilitada}
            generando={generando}
            iaOcupada={!!iaOcupada || calculando || generandoTodo}
            mensajeProgreso={mensajeGenerar}
            progreso={progresoGenerar}
            onGenerar={handleGenerar}
            onCancelar={handleCancelar}
            motivoBloqueo={
              !etapa1Completa(bloques)
                ? 'Completá "1. Generar datos" primero.'
                : 'Completá los prerrequisitos para generar con IA.'
            }
          />
          <Button
            variant="outline"
            onClick={handleGenerarTodo}
            disabled={calculando || generando || generandoTodo || !!iaOcupada || !prerrequisitos.puedeGenerar}
            className="shrink-0"
            title="Ejecuta '1. Generar datos' y luego '2. Redactar con IA' en secuencia"
          >
            {generandoTodo
              ? <><Loader2 className="animate-spin mr-2" size={14} />Generando todo...</>
              : 'Generar todo'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <BotonExportarDocx
            proyectoId={proyectoId}
            orgNodos={contexto.organigrama}
            incluirOrganigrama={plan.incluirOrganigrama}
            disabled={generando}
          />
          <HistorialGeneraciones proyectoId={proyectoId} />
          <div className="ml-auto">
            <BotonEliminarPlan
              proyectoId={proyectoId}
              onEliminado={() => window.location.reload()}
              disabled={generando || !!iaOcupada}
            />
          </div>
        </div>
      </div>

      {iaOcupada && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-center gap-2">
          <span className="font-medium">Operación IA en curso:</span>
          <span>{plan.operacionIAEnCurso}</span>
          <span className="text-amber-700">· iniciada hace {minutosTranscurridos(plan.operacionIAIniciadaEn)} min</span>
        </div>
      )}

      {/* ─── Editores (se montan solo cuando el usuario los abre) ─── */}
      {editandoSeccion === 'objetivo' && (
        <ObjetivoEditor
          valor={plan.objetivo ?? ''}
          onSave={(v) => handleSaveSeccion('objetivo', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'alcanceGeneral' && (
        <AlcanceGeneralEditor
          valor={plan.alcanceGeneral ?? ''}
          onSave={(v) => handleSaveSeccion('alcanceGeneral', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'alcanceDetallado' && (
        <AlcanceDetalladoEditor
          valor={(plan.alcanceDetallado as PlanAlcanceDetalladoEdt[] | null) ?? []}
          onSave={(v) => handleSaveSeccion('alcanceDetallado', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'eppRequeridos' && (
        <EppRequeridosEditor
          valor={(plan.eppRequeridos as PlanEPP | null) ?? { basico: [], bioseguridad: [], riesgoEspecifico: [] }}
          onSave={(v) => handleSaveSeccion('eppRequeridos', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'herramientasYEquipos' && (
        <HerramientasEditor
          valor={(plan.herramientasYEquipos as PlanHerramientasYEquipos | null) ?? { equipos: [], herramientas: [], materiales: [] }}
          onSave={(v) => handleSaveSeccion('herramientasYEquipos', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'restricciones' && (
        <RestriccionesEditor
          valor={(plan.restricciones as PlanRestriccion[] | null) ?? []}
          onSave={(v) => handleSaveSeccion('restricciones', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'personalAsignado' && (
        <PersonalAsignadoEditor
          valor={(plan.personalAsignado as PlanPersonal[] | null) ?? []}
          onSave={(v) => handleSaveSeccion('personalAsignado', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'referencias' && (
        <ReferenciasEditor
          valor={(plan.referencias as PlanReferencia[] | null) ?? []}
          onSave={(v) => handleSaveSeccion('referencias', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'cronogramaResumen' && (
        <CronogramaResumenEditor
          valor={(plan.cronogramaResumen as PlanCronograma | null) ?? { filas: [] }}
          onSave={(v) => handleSaveSeccion('cronogramaResumen', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'responsabilidades' && (
        <ResponsabilidadesEditor
          valor={(plan.responsabilidades as PlanResponsabilidades | null) ?? {
            gerenteGeneral: [],
            supervisor: [],
            operario: [],
            supervisorSeguridad: [],
          }}
          onSave={(v) => handleSaveSeccion('responsabilidades', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'histogramas' && (
        <HistogramasEditor
          valor={(plan.histogramas as PlanHistogramas | null) ?? {
            meses: [],
            equipoTrabajo: [],
            horasHombre: [],
          }}
          onSave={(v) => handleSaveSeccion('histogramas', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}
      {editandoSeccion === 'matrizRaci' && (
        <MatrizRaciEditor
          valor={(plan.matrizRaci as PlanRaci | null) ?? { filas: [] }}
          personal={(plan.personalAsignado as PlanPersonal[] | null) ?? []}
          onSave={(v) => handleSaveSeccion('matrizRaci', v)}
          onCancel={() => setEditandoSeccion(null)}
        />
      )}

      {/* ─── Secciones ─── */}
      <div className="space-y-3">
        <SeccionContainer
          seccion="objetivo"
          titulo="Objetivo del Proyecto (Etapa 2 — IA)"
          completa={bloques.objetivo}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('objetivo')}
        >
          <ObjetivoView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="alcanceGeneral"
          titulo="Alcance General (Etapa 2 — IA)"
          completa={bloques.alcanceGeneral}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('alcanceGeneral')}
        >
          <AlcanceGeneralView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="alcanceDetallado"
          titulo="Alcance Detallado (Etapa 2 — IA)"
          completa={bloques.alcanceDetallado}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('alcanceDetallado')}
        >
          <AlcanceDetalladoView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="eppRequeridos"
          titulo="EPP Requeridos (Etapa 2 — IA)"
          completa={bloques.eppRequeridos}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('eppRequeridos')}
        >
          <EppRequeridosView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="herramientasYEquipos"
          titulo="Herramientas y Equipos (Etapa 2 — IA)"
          completa={bloques.herramientasYEquipos}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('herramientasYEquipos')}
        >
          <HerramientasView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="restricciones"
          titulo="Restricciones (Etapa 2 — IA)"
          completa={bloques.restricciones}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('restricciones')}
        >
          <RestriccionesView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="personalAsignado"
          titulo="Personal Asignado (Etapa 1 — calculado, sin IA)"
          completa={bloques.personalAsignado}
          iaHabilitada={prerrequisitos.puedeGenerar}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('personalAsignado')}
        >
          <PersonalAsignadoView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="matrizRaci"
          titulo="Matriz RACI (Etapa 1 — calculada, sin IA)"
          completa={bloques.matrizRaci}
          iaHabilitada={prerrequisitos.puedeGenerar}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('matrizRaci')}
        >
          <MatrizRaciView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="histogramas"
          titulo="Histogramas (Etapa 1 — calculados, sin IA)"
          completa={bloques.histogramas}
          iaHabilitada={prerrequisitos.puedeGenerar}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('histogramas')}
        >
          <HistogramasView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="cronogramaResumen"
          titulo="Cronograma Resumen (Etapa 1 — calculado, sin IA)"
          completa={bloques.cronogramaResumen}
          iaHabilitada={prerrequisitos.puedeGenerar}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('cronogramaResumen')}
        >
          <CronogramaResumenView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="responsabilidades"
          titulo="Responsabilidades (texto fijo de plantilla — no se exporta)"
          completa={bloques.responsabilidades}
          iaHabilitada={false}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('responsabilidades')}
        >
          <ResponsabilidadesView plan={plan} />
        </SeccionContainer>

        <SeccionContainer
          seccion="referencias"
          titulo="Referencias (Etapa 1 — calculadas, sin IA)"
          completa={bloques.referencias}
          iaHabilitada={prerrequisitos.puedeGenerar}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => setEditandoSeccion('referencias')}
        >
          <ReferenciasView plan={plan} />
        </SeccionContainer>
      </div>
    </div>
  )
}
