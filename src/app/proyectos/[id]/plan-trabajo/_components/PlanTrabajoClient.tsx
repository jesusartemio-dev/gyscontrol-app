'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Loader2, BookOpen, Plus, Sparkles, X, AlertTriangle, Camera, MoreHorizontal, Calculator, RefreshCw, Settings2, Hand } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { VersionRevisadaView } from './VersionRevisadaView'

import type { PlanTrabajoContexto, SeccionRegenerable } from '@/types/planTrabajo'
import type { PlanTrabajo, PlanTrabajoImagen } from '@prisma/client'

import { readSSEStream } from '@/lib/planTrabajo/sseClient'
import { PreRequisitosPanel } from './PreRequisitosPanel'
import { ConfiguracionPlan, problemaConfiguracion } from './ConfiguracionPlan'
import { ConfirmarRegeneracionDialog, type ModoRegeneracion } from './ConfirmarRegeneracionDialog'
import { leerEdiciones, contarTextosEditadosAlcance } from '@/lib/planTrabajo/edicionesManuales'
import { BotonCalcularDatos } from './BotonCalcularDatos'
import { BotonGenerarIA } from './BotonGenerarIA'
import { BotonExportarDocx } from './BotonExportarDocx'
import { BotonEliminarPlan } from './BotonEliminarPlan'
import { HistorialGeneraciones } from './HistorialGeneraciones'
import { SeccionContainer } from './SeccionContainer'
import { SubirVersionPlan } from './SubirVersionPlan'
import { SECCIONES_ETAPA_1, SECCIONES_ETAPA_2, etapa1Completa, algunaSeccionEtapa2Completa } from '@/lib/planTrabajo/etapas'

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
  // Alcance Detallado: índice del EDT a editar solo (lápiz de cada EDT); null = todo.
  const [edtEnfocado, setEdtEnfocado] = useState<number | null>(null)
  const [recienCreado, setRecienCreado] = useState(false)
  const [progresoGenerar, setProgresoGenerar] = useState(0)
  const [errorGeneracion, setErrorGeneracion] = useState<{ mensaje: string } | null>(null)
  // Confirmación de Recalcular datos / Redactar con IA / Generar todo (dice qué se respeta).
  const [confirmar, setConfirmar] = useState<ModoRegeneracion | null>(null)
  // Configuración del documento abierta/cerrada por el usuario (null = según la etapa). Se recuerda.
  const [configAbiertaUsuario, setConfigAbiertaUsuario] = useState<boolean | null>(null)
  const claveConfig = `planTrabajo.config.${proyectoId}`
  useEffect(() => {
    try {
      const v = localStorage.getItem(claveConfig)
      if (v === 'abierta' || v === 'cerrada') setConfigAbiertaUsuario(v === 'abierta')
    } catch { /* sin almacenamiento */ }
  }, [claveConfig])
  const [configCerradaEnSesion, setConfigCerradaEnSesion] = useState(false)
  const guardarConfigAbierta = (abierta: boolean) => {
    setConfigAbiertaUsuario(abierta)
    try { localStorage.setItem(claveConfig, abierta ? 'abierta' : 'cerrada') } catch { /* sin almacenamiento */ }
  }
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null)
  const [vista, setVista] = useState<'estructurada' | 'v2'>('estructurada')
  const vistaInicializadaRef = useRef(false)
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

  // Default a la pestaña "Versión revisada (V2)" la PRIMERA vez que se detecta
  // una versión IMPORTADO vigente — solo una vez, para no devolver al usuario
  // ahí si manualmente volvió a la vista estructurada y algo dispara un refetch.
  useEffect(() => {
    if (vistaInicializadaRef.current || !contexto) return
    const generaciones = (contexto.planTrabajo as { generaciones?: { origen: string; vigente: boolean }[] } | null)?.generaciones ?? []
    if (generaciones.some(g => g.origen === 'IMPORTADO' && g.vigente)) {
      setVista('v2')
    }
    vistaInicializadaRef.current = true
  }, [contexto])

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
  // `omitir`: secciones editadas a mano que el usuario decidió respetar.
  const handleCalcularDatos = async (omitir: string[] = []): Promise<boolean> => {
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
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/calcular-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omitir }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? 'Error al calcular los datos')
      }
      await fetchContexto()
      const advertencias = (body.advertencias as string[] | undefined) ?? []
      if (advertencias.length > 0) {
        console.warn('[plan-trabajo] Advertencias de "1. Generar datos":', advertencias)
        toast.warning(
          `Datos calculados con ${advertencias.length} advertencia(s) — ver detalle completo en la consola del navegador: ${advertencias.slice(0, 2).join(' · ')}${advertencias.length > 2 ? '…' : ''}`,
          { duration: 8000 }
        )
      } else {
        const respetadas = (body.data?.seccionesRespetadas as string[] | undefined) ?? []
        toast.success(respetadas.length
          ? `Datos recalculados; se respetaron ${respetadas.length} sección(es) editada(s) a mano`
          : 'Datos calculados: personal, RACI, histogramas, cronograma y referencias')
      }
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al calcular los datos')
      return false
    } finally {
      setCalculando(false)
    }
  }

  // `omitir`: secciones editadas a mano que el usuario decidió respetar.
  const iniciarGeneracion = async (omitir: string[] = []) => {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omitir }),
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

  const avisarPrerrequisitos = (): boolean => {
    if (contexto?.prerrequisitos.puedeGenerar) return true
    const faltantes = contexto?.prerrequisitos.bloqueantesFaltantes ?? []
    toast.error(
      faltantes.length > 0
        ? `Faltan prerrequisitos: ${faltantes.join(' · ')}`
        : 'Completá los prerrequisitos antes de generar',
      { duration: 6000 }
    )
    return false
  }

  // "2. Redactar con IA" (o "Redactar todo de nuevo"): siempre pasa por la
  // confirmación, que dice qué se reescribe y qué se respeta.
  const handleGenerar = async () => {
    if (!avisarPrerrequisitos()) return
    const bloquesActuales = (contexto?.planTrabajo as Record<string, unknown>)?.bloquesCompletitud as Record<string, boolean> | undefined
    if (!etapa1Completa(bloquesActuales)) {
      toast.error('Completá primero "1. Generar datos" — el prompt de IA necesita el personal y las horas ya calculados.', { duration: 6000 })
      return
    }
    setConfirmar('ia')
  }

  // "1. Generar datos": la primera vez no hay nada que perder y corre directo;
  // si ya hay datos calculados, confirma antes de reemplazarlos.
  const handlePedirCalcularDatos = async () => {
    if (!avisarPrerrequisitos()) return
    const bloquesActuales = ((contexto?.planTrabajo as Record<string, unknown>)?.bloquesCompletitud ?? {}) as Record<string, boolean>
    if (SECCIONES_ETAPA_1.some((s) => bloquesActuales[s])) {
      setConfirmar('datos')
      return
    }
    await handleCalcularDatos()
  }

  // "Generar todo": Etapa 1 → Etapa 2 encadenado (después de confirmar).
  const handleGenerarTodo = async (omitir: { datos: string[]; ia: string[] }) => {
    setGenerandoTodo(true)
    try {
      const ok = await handleCalcularDatos(omitir.datos)
      if (!ok) return
      await iniciarGeneracion(omitir.ia)
    } finally {
      setGenerandoTodo(false)
    }
  }

  const handleConfirmar = async (omitir: { datos: string[]; ia: string[] }) => {
    const modo = confirmar
    setConfirmar(null)
    if (modo === 'datos') await handleCalcularDatos(omitir.datos)
    else if (modo === 'ia') await iniciarGeneracion(omitir.ia)
    else if (modo === 'todo') await handleGenerarTodo(omitir)
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
            console.warn(`[plan-trabajo] Advertencias al recalcular "${seccion}":`, advertencias)
            toast.warning(
              `Sección "${seccion}" recalculada con advertencias — ver detalle completo en la consola: ${advertencias.slice(0, 2).join(' · ')}${advertencias.length > 2 ? '…' : ''}`,
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

  const handleSaveSeccion = async (seccion: SeccionEditable, valor: unknown, { cerrar = true } = {}) => {
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
    if (cerrar) setEditandoSeccion(null)
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

  const plan = planTrabajo as PlanTrabajo & { generaciones: { id: string; origen: string; vigente: boolean }[]; imagenes: PlanTrabajoImagen[]; operacionIAEnCurso?: string | null; operacionIAIniciadaEn?: Date | null }
  const bloques = (plan.bloquesCompletitud ?? {}) as Record<string, boolean>
  const LOCK_EXPIRY_MS = 10 * 60 * 1000
  const lockAge = plan.operacionIAIniciadaEn ? Date.now() - new Date(plan.operacionIAIniciadaEn).getTime() : Infinity
  const iaOcupada = !!plan.operacionIAEnCurso && lockAge < LOCK_EXPIRY_MS
  const tieneV2Vigente = plan.generaciones.some(g => g.origen === 'IMPORTADO' && g.vigente)

  function minutosTranscurridos(fecha: Date | null | undefined): number {
    if (!fecha) return 0
    return Math.round((Date.now() - new Date(fecha).getTime()) / 60000)
  }

  // Ediciones a mano desde la última generación (se avisan y se pueden respetar al regenerar).
  const ediciones = leerEdiciones((plan as { seccionesEditadas?: unknown }).seccionesEditadas)
  const textosEditadosAlcance = contarTextosEditadosAlcance(plan.alcanceDetallado)
  const editadasAMano = Object.keys(ediciones).length + (textosEditadosAlcance > 0 ? 1 : 0)

  // Etapa del plan: la página muestra lo que corresponde a cada momento.
  //  preparar → falta calcular los datos (configuración abierta, "1. Generar datos")
  //  redactar → datos listos, sin IA ("2. Redactar con IA" destacado)
  //  revisar  → ya hay secciones redactadas (estado, exportar; regenerar por sección o "Más acciones")
  const etapa: 'preparar' | 'redactar' | 'revisar' =
    !etapa1Completa(bloques) ? 'preparar' : !algunaSeccionEtapa2Completa(bloques) ? 'redactar' : 'revisar'
  const iaHechas = SECCIONES_ETAPA_2.filter((s) => bloques[s]).length
  const datosHechos = SECCIONES_ETAPA_1.filter((s) => bloques[s]).length

  // Configuración: abierta al preparar; después cerrada salvo que el usuario la abra.
  // Si algo falla (prerrequisito, cabecera) se abre sola, salvo que la cierre en esta visita.
  const problemaConfig = problemaConfiguracion(plan, prerrequisitos)
  const configAbierta = problemaConfig ? !configCerradaEnSesion : (configAbiertaUsuario ?? etapa === 'preparar')
  const toggleConfig = () => {
    guardarConfigAbierta(!configAbierta)
    setConfigCerradaEnSesion(configAbierta)
  }
  const ocupado = calculando || generando || generandoTodo || !!iaOcupada

  // Editores + secciones — vive en una const para poder mostrarlo tal cual
  // esté (con Tabs) o no (sin V2 vigente, vista única de siempre) sin
  // duplicar el JSX.
  const contenidoEstructurado = (
    <>
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
          proyectoId={proyectoId}
          valor={(plan.alcanceDetallado as PlanAlcanceDetalladoEdt[] | null) ?? []}
          herramientasYEquipos={(plan.herramientasYEquipos as PlanHerramientasYEquipos | null) ?? { equipos: [], herramientas: [], materiales: [] }}
          imagenes={plan.imagenes}
          onImagenesChanged={fetchContexto}
          onSave={(v) => handleSaveSeccion('alcanceDetallado', v)}
          onGuardarParcial={(v) => handleSaveSeccion('alcanceDetallado', v, { cerrar: false })}
          onCancel={() => setEditandoSeccion(null)}
          soloEdt={edtEnfocado ?? undefined}
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
          titulo="Objetivo del Proyecto"
          tipo="ia"
          edicion={ediciones.objetivo}
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
          titulo="Alcance General"
          tipo="ia"
          edicion={ediciones.alcanceGeneral}
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
          titulo="Alcance Detallado"
          tipo="ia"
          textosEditadosAlcance={textosEditadosAlcance}
          completa={bloques.alcanceDetallado}
          iaHabilitada={iaPlanTrabajoHabilitada && prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
          iaOcupada={iaOcupada}
          onRegen={handleRegen}
          regenerando={regenerando}
          mensajeRegen={mensajeRegen}
          onEditar={() => { setEdtEnfocado(null); setEditandoSeccion('alcanceDetallado') }}
        >
          <AlcanceDetalladoView
            plan={plan}
            proyectoId={proyectoId}
            imagenes={plan.imagenes}
            onEditarEdt={(idx) => { setEdtEnfocado(idx); setEditandoSeccion('alcanceDetallado') }}
          />
        </SeccionContainer>

        <SeccionContainer
          seccion="eppRequeridos"
          titulo="EPP Requeridos"
          tipo="ia"
          edicion={ediciones.eppRequeridos}
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
          titulo="Herramientas y Equipos"
          tipo="ia"
          edicion={ediciones.herramientasYEquipos}
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
          titulo="Restricciones"
          tipo="ia"
          edicion={ediciones.restricciones}
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
          titulo="Personal Asignado"
          tipo="calculado"
          edicion={ediciones.personalAsignado}
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
          titulo="Matriz RACI"
          tipo="calculado"
          edicion={ediciones.matrizRaci}
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
          titulo="Histogramas"
          tipo="calculado"
          edicion={ediciones.histogramas}
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
          titulo="Cronograma Resumen"
          tipo="calculado"
          edicion={ediciones.cronogramaResumen}
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
          titulo="Responsabilidades (no se exporta)"
          tipo="plantilla"
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
          titulo="Referencias"
          tipo="calculado"
          edicion={ediciones.referencias}
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
    </>
  )

  return (
    <div className="space-y-4 p-4">
      <ConfirmarRegeneracionDialog
        modo={confirmar}
        onClose={() => setConfirmar(null)}
        bloques={bloques}
        ediciones={ediciones}
        alcanceDetallado={plan.alcanceDetallado}
        tieneV2Vigente={tieneV2Vigente}
        onConfirmar={handleConfirmar}
      />

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

      <ConfiguracionPlan
        proyectoId={proyectoId}
        plan={plan}
        prerrequisitos={prerrequisitos}
        abierta={configAbierta}
        onToggle={toggleConfig}
        onUpdated={fetchContexto}
      />

      {recienCreado && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <Sparkles size={16} className="text-indigo-500 shrink-0" />
          <span>
            <strong>¡Plan creado!</strong> Revisá la configuración del documento y hacé click en <strong>1. Generar datos</strong>; después podrás redactar con IA.
          </span>
          <button onClick={() => setRecienCreado(false)} className="ml-auto text-indigo-300 hover:text-indigo-500 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Acciones según la etapa del plan ─── */}
      {etapa === 'revisar' ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2">
            {/* Estado del plan */}
            <div className="mr-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-gray-700">Plan redactado</span>
              <span className={iaHechas === SECCIONES_ETAPA_2.length ? 'text-emerald-600' : 'text-amber-600'}>
                IA {iaHechas}/{SECCIONES_ETAPA_2.length}
              </span>
              <span className={datosHechos === SECCIONES_ETAPA_1.length ? 'text-emerald-600' : 'text-amber-600'}>
                Datos {datosHechos}/{SECCIONES_ETAPA_1.length}
              </span>
              {plan.fechaGeneracionIA && (
                <span>
                  Última generación: {new Date(plan.fechaGeneracionIA).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {editadasAMano > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700" title="Al regenerar se avisa y se pueden respetar">
                  <Hand size={12} />
                  {editadasAMano} sección(es) editada(s) a mano
                </span>
              )}
            </div>
            <BotonExportarDocx
              proyectoId={proyectoId}
              orgNodos={contexto.organigrama}
              incluirOrganigrama={plan.incluirOrganigrama}
              disabled={generando}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/proyectos/${proyectoId}/plan-trabajo/campo`} target="_blank">
                <Camera size={14} className="mr-2" />
                Modo Campo
              </Link>
            </Button>
            <SubirVersionPlan
              proyectoId={proyectoId}
              alcanceDetallado={(plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []}
              onVersionSubida={fetchContexto}
            />
            <HistorialGeneraciones proyectoId={proyectoId} />
            {/* Regenerar en bloque: detrás de un menú y siempre con confirmación */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={ocupado}>
                  <MoreHorizontal size={14} className="mr-1.5" />
                  Más acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => setTimeout(() => { void handlePedirCalcularDatos() }, 0)}>
                  <Calculator size={14} className="mr-2 text-emerald-600" />
                  Recalcular datos…
                </DropdownMenuItem>
                {iaPlanTrabajoHabilitada && (
                  <DropdownMenuItem onSelect={() => setTimeout(() => { void handleGenerar() }, 0)}>
                    <RefreshCw size={14} className="mr-2 text-indigo-600" />
                    Redactar todo de nuevo con IA…
                  </DropdownMenuItem>
                )}
                {iaPlanTrabajoHabilitada && (
                  <DropdownMenuItem onSelect={() => setTimeout(() => { if (avisarPrerrequisitos()) setConfirmar('todo') }, 0)}>
                    <Sparkles size={14} className="mr-2 text-indigo-600" />
                    Generar todo (datos + IA)…
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    guardarConfigAbierta(true)
                    setConfigCerradaEnSesion(false)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  <Settings2 size={14} className="mr-2" />
                  Configuración del documento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <BotonEliminarPlan
              proyectoId={proyectoId}
              onEliminado={() => window.location.reload()}
              disabled={generando || !!iaOcupada}
            />
          </div>
          {/* Progreso de lo lanzado desde "Más acciones" */}
          {generando && (
            <BotonGenerarIA
              puedeGenerar={prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
              iaHabilitada={iaPlanTrabajoHabilitada}
              generando={generando}
              iaOcupada={!!iaOcupada || calculando || generandoTodo}
              mensajeProgreso={mensajeGenerar}
              progreso={progresoGenerar}
              onGenerar={handleGenerar}
              onCancelar={handleCancelar}
            />
          )}
          {calculando && (
            <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              Recalculando datos…
            </div>
          )}
        </div>
      ) : (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preparar: "1. Generar datos". Redactar: "2. Redactar con IA". */}
          {etapa === 'preparar' ? (
            <BotonCalcularDatos
              puedeGenerar={prerrequisitos.puedeGenerar}
              calculando={calculando}
              disabled={generando || generandoTodo || !!iaOcupada}
              destacar={recienCreado}
              onCalcular={handlePedirCalcularDatos}
            />
          ) : (
            <BotonGenerarIA
              puedeGenerar={prerrequisitos.puedeGenerar && etapa1Completa(bloques)}
              iaHabilitada={iaPlanTrabajoHabilitada}
              generando={generando}
              iaOcupada={!!iaOcupada || calculando || generandoTodo}
              mensajeProgreso={mensajeGenerar}
              progreso={progresoGenerar}
              onGenerar={handleGenerar}
              onCancelar={handleCancelar}
              motivoBloqueo="Completá los prerrequisitos para generar con IA."
            />
          )}
          {etapa === 'redactar' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void handlePedirCalcularDatos() }}
              disabled={ocupado || !prerrequisitos.puedeGenerar}
              className="shrink-0"
              title="Vuelve a calcular personal, RACI, histogramas, cronograma y referencias"
            >
              {calculando
                ? <><Loader2 className="animate-spin mr-2" size={14} />Calculando...</>
                : <><Calculator size={14} className="mr-2" />Recalcular datos</>}
            </Button>
          )}
          {iaPlanTrabajoHabilitada && (
            <Button
              variant="outline"
              onClick={() => { if (avisarPrerrequisitos()) setConfirmar('todo') }}
              disabled={ocupado || !prerrequisitos.puedeGenerar}
              className="shrink-0"
              title="Ejecuta '1. Generar datos' y luego '2. Redactar con IA' en secuencia"
            >
              {generandoTodo
                ? <><Loader2 className="animate-spin mr-2" size={14} />Generando todo...</>
                : 'Generar todo'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BotonExportarDocx
            proyectoId={proyectoId}
            orgNodos={contexto.organigrama}
            incluirOrganigrama={plan.incluirOrganigrama}
            disabled={generando}
          />
          <HistorialGeneraciones proyectoId={proyectoId} />
          <SubirVersionPlan
            proyectoId={proyectoId}
            alcanceDetallado={(plan.alcanceDetallado as unknown as PlanAlcanceDetalladoEdt[] | null) ?? []}
            onVersionSubida={fetchContexto}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/proyectos/${proyectoId}/plan-trabajo/campo`} target="_blank">
              <Camera size={14} className="mr-2" />
              Modo Campo
            </Link>
          </Button>
          <div className="ml-auto">
            <BotonEliminarPlan
              proyectoId={proyectoId}
              onEliminado={() => window.location.reload()}
              disabled={generando || !!iaOcupada}
            />
          </div>
        </div>
      </div>
      )}

      {iaOcupada && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-center gap-2">
          <span className="font-medium">Operación IA en curso:</span>
          <span>{plan.operacionIAEnCurso}</span>
          <span className="text-amber-700">· iniciada hace {minutosTranscurridos(plan.operacionIAIniciadaEn)} min</span>
        </div>
      )}

      {tieneV2Vigente ? (
        <Tabs value={vista} onValueChange={(v) => setVista(v as 'estructurada' | 'v2')}>
          <TabsList>
            <TabsTrigger value="estructurada">Vista estructurada (app)</TabsTrigger>
            <TabsTrigger value="v2">Versión revisada (V2)</TabsTrigger>
          </TabsList>
          <TabsContent value="estructurada" className="space-y-4 mt-2">
            {contenidoEstructurado}
          </TabsContent>
          <TabsContent value="v2" className="mt-2">
            <VersionRevisadaView proyectoId={proyectoId} />
          </TabsContent>
        </Tabs>
      ) : (
        contenidoEstructurado
      )}
    </div>
  )
}
