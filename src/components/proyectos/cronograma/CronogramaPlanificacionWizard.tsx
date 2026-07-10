'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Sparkles, AlertCircle, FileCheck2, History, Pin, PinOff, FolderInput, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ActividadPropuesta, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'
import type { EdtSugeridoConOrigen } from '@/lib/cronogramaIA/derivarEdtsSoporte'
import { detectarEdtsPosibles, type EvidenciaTexto } from '@/lib/cronogramaIA/detectarEdtsPosibles'
import { AutoasignarResponsablesModal } from './AutoasignarResponsablesModal'
import {
  BORRADOR_LOCAL_PASO1_VERSION,
  claveBorradorLocalPaso1,
  esBorradorLocalValido,
  type BorradorLocalPaso1,
} from '@/lib/cronogramaIA/borradorWizard'

interface EdtWizardInfo {
  id: string
  nombre: string
  descripcion: string | null
  faseNombre: string | null
  totalServicios: number
}

interface CotizacionResumen {
  numeroPropuesta: string | null
  clienteDetectado: string | null
  resumenAlcance: string[]
  exclusiones: string[]
}

interface EdtPendienteIA {
  id: string
  nombre: string
}

interface PrellenadoPaso1 {
  edtsSeleccionados: string[]
  brownfield: boolean
  ingenieriaDetalle: boolean
  tableros: { nombre: string }[]
  plcs: { nombre: string }[]
  hmiCantidad: number
  scada: boolean
}

interface CorreccionEdt {
  id: string
  edtId: string
  edtNombre: string
  edtDescripcion: string | null
  motivo: string | null
  creadoEn: string
}

interface BorradorGeneracion {
  id: string
  configuracion: ConfiguracionWizardPaso1
  propuestaActividades: ActividadPropuesta[]
  advertencias: string[]
  edtsPendientesIA: EdtPendienteIA[]
  estado: string
}

interface DatosContextoWizard {
  edtsSugeridosComercial: string[] | null
  edtsSugeridosConOrigen: EdtSugeridoConOrigen[] | null
  cotizacionResumen: CotizacionResumen | null
  tieneCotizacionDocumento: boolean
}

interface Props {
  proyectoId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const PASOS = ['Alcance del proyecto', 'Actividades propuestas']

export function CronogramaPlanificacionWizard({ proyectoId, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast()
  const [pasoActual, setPasoActual] = useState(1)

  const [cargandoContexto, setCargandoContexto] = useState(false)
  const [cargandoPrellenado, setCargandoPrellenado] = useState(false)
  const [edts, setEdts] = useState<EdtWizardInfo[]>([])
  const [cotizacionResumen, setCotizacionResumen] = useState<CotizacionResumen | null>(null)
  const [advertenciasPrellenado, setAdvertenciasPrellenado] = useState<string[]>([])

  const [edtsSeleccionados, setEdtsSeleccionados] = useState<Set<string>>(new Set())
  const [brownfield, setBrownfield] = useState(false)
  const [ingenieriaDetalle, setIngenieriaDetalle] = useState(false)
  const [tableros, setTableros] = useState<{ nombre: string }[]>([])
  const [plcs, setPlcs] = useState<{ nombre: string }[]>([])
  const [hmiCantidad, setHmiCantidad] = useState(0)
  const [scada, setScada] = useState(false)
  const [nValorizaciones, setNValorizaciones] = useState(0)
  const [duracionSemanas, setDuracionSemanas] = useState(0)
  const [nPersonas, setNPersonas] = useState(0)
  const [nPets, setNPets] = useState(0)
  const [alcanceLibre, setAlcanceLibre] = useState('')

  const [generandoPaso1, setGenerandoPaso1] = useState(false)
  const [guardandoPaso2, setGuardandoPaso2] = useState(false)
  const [generandoIA, setGenerandoIA] = useState(false)
  const [aplicandoCronograma, setAplicandoCronograma] = useState(false)
  const [generacionId, setGeneracionId] = useState<string | null>(null)
  const [actividades, setActividades] = useState<ActividadPropuesta[]>([])
  const [advertencias, setAdvertencias] = useState<string[]>([])
  const [edtsPendientesIA, setEdtsPendientesIA] = useState<EdtPendienteIA[]>([])
  const [fuenteEdtsSugeridos, setFuenteEdtsSugeridos] = useState<'comercial' | 'ia' | 'manual' | 'restaurado'>('manual')
  const [edtsOrigen, setEdtsOrigen] = useState<Map<string, EdtSugeridoConOrigen>>(new Map())
  const [correccionesEdt, setCorreccionesEdt] = useState<CorreccionEdt[]>([])
  const [guardandoCorreccion, setGuardandoCorreccion] = useState<string | null>(null)
  const [evidenciasCotizacion, setEvidenciasCotizacion] = useState<EvidenciaTexto[]>([])

  // Persistencia del wizard (evita perder Paso 1/Paso 2/propuestas de IA por un cierre accidental).
  const [datosContexto, setDatosContexto] = useState<DatosContextoWizard | null>(null)
  const [borradorDisponible, setBorradorDisponible] = useState<BorradorGeneracion | null>(null)
  const [borradorLocalDisponible, setBorradorLocalDisponible] = useState<BorradorLocalPaso1 | null>(null)
  const [decidiendoBorrador, setDecidiendoBorrador] = useState(false)
  const [guardadoPendiente, setGuardadoPendiente] = useState(false)
  const [ultimoGuardadoFallo, setUltimoGuardadoFallo] = useState(false)
  const [mostrarConfirmarCierre, setMostrarConfirmarCierre] = useState(false)
  const [mostrarConfirmarReset, setMostrarConfirmarReset] = useState(false)
  // Al aplicar el cronograma, se ofrece autoasignar responsables desde la
  // Matriz de Comunicación (con confirmación propia) — no null significa
  // "mostrar el modal para este cronograma recién aplicado".
  const [cronogramaIdAplicado, setCronogramaIdAplicado] = useState<string | null>(null)

  // Gate de hidratación para el autoguardado de Paso 1 en localStorage: un
  // useState (cargandoContexto/decidiendoBorrador) NO sirve para esto porque
  // dos efectos que corren en el mismo commit ven el mismo snapshot de
  // estado pre-render — el efecto de autoguardado podía correr con
  // cargandoContexto todavía en false (valor previo) y escribir un draft en
  // blanco ANTES de que la carga real terminara, que después se "restauraba"
  // pisando la precarga real. Una ref se lee/escribe de forma síncrona e
  // inmediata, sin ese desfase.
  const contextoListoRef = useRef(false)

  /**
   * Lee el draft local del Paso 1, validándolo (schemaVersion + no vacío)
   * antes de considerarlo restaurable. Si hay algo guardado pero no pasa la
   * validación, se descarta silenciosamente (nunca se restaura "en blanco"
   * como si fuera una elección del usuario) y se avisa con un toast.
   */
  function leerBorradorLocal(): BorradorLocalPaso1 | null {
    let crudo: string | null = null
    try {
      crudo = localStorage.getItem(claveBorradorLocalPaso1(proyectoId))
    } catch {
      return null
    }
    if (!crudo) return null

    let parsed: unknown = null
    try {
      parsed = JSON.parse(crudo)
    } catch {
      parsed = null
    }

    if (esBorradorLocalValido(parsed)) return parsed

    try {
      localStorage.removeItem(claveBorradorLocalPaso1(proyectoId))
    } catch {
      // no-op
    }
    toast({ title: 'Tu borrador anterior no era válido, se recargó desde la cotización' })
    return null
  }

  /**
   * Flujo normal de precarga del Paso 1 (cotización comercial + reglas de
   * soporte + prellenado IA como último recurso) — separado del efecto para
   * poder reusarlo desde "Empezar de nuevo"/"Restablecer" cuando el usuario
   * descarta un borrador existente (en BD o local).
   */
  function aplicarFlujoNormal(contexto: DatosContextoWizard, edtsFrescos: EdtWizardInfo[]) {
    const edtsComercial = contexto.edtsSugeridosComercial

    if (contexto.edtsSugeridosConOrigen && contexto.edtsSugeridosConOrigen.length > 0) {
      setEdtsSeleccionados(new Set(contexto.edtsSugeridosConOrigen.map(e => e.id)))
      setEdtsOrigen(new Map(contexto.edtsSugeridosConOrigen.map(e => [e.id, e])))
      setFuenteEdtsSugeridos('comercial')
    } else {
      setEdtsSeleccionados(new Set(edtsFrescos.filter(e => e.totalServicios > 0).map(e => e.id)))
      setFuenteEdtsSugeridos('manual')
    }

    if (contexto.cotizacionResumen?.resumenAlcance?.length) {
      setAlcanceLibre(contexto.cotizacionResumen.resumenAlcance.join('\n'))
    }

    // A partir de acá el estado del Paso 1 refleja una precarga real (no el
    // valor en blanco inicial) — recién ahora es seguro autoguardar.
    contextoListoRef.current = true

    if (!contexto.tieneCotizacionDocumento) return

    setCargandoPrellenado(true)
    fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/prellenado-ia`, { method: 'POST' })
      .then(async res => (res.ok ? res.json() : null))
      .then((prellenado: { sugerencia: PrellenadoPaso1; advertencias: string[] } | null) => {
        if (!prellenado) return
        const s = prellenado.sugerencia
        // El EDT sugerido por IA nunca pisa una selección ya determinista
        // (cotización comercial) — solo se usa cuando no hubo otra fuente.
        if (s.edtsSeleccionados.length > 0 && !(edtsComercial && edtsComercial.length > 0)) {
          setEdtsSeleccionados(new Set(s.edtsSeleccionados))
          setFuenteEdtsSugeridos('ia')
        }
        setBrownfield(s.brownfield)
        setIngenieriaDetalle(s.ingenieriaDetalle)
        if (s.tableros.length > 0) setTableros(s.tableros)
        if (s.plcs.length > 0) setPlcs(s.plcs)
        if (s.hmiCantidad > 0) setHmiCantidad(s.hmiCantidad)
        setScada(s.scada)
        setAdvertenciasPrellenado(prellenado.advertencias ?? [])
      })
      .catch(() => {
        toast({ title: 'Error sugiriendo el Paso 1 con IA', variant: 'destructive' })
      })
      .finally(() => setCargandoPrellenado(false))
  }

  function continuarBorrador() {
    if (!borradorDisponible) return
    const c = borradorDisponible.configuracion
    setGeneracionId(borradorDisponible.id)
    setEdtsSeleccionados(new Set(c.edtsSeleccionados))
    setBrownfield(c.brownfield)
    setIngenieriaDetalle(c.ingenieriaDetalle)
    setTableros(c.tableros)
    setPlcs(c.plcs)
    setHmiCantidad(c.hmiCantidad)
    setScada(c.scada)
    setNValorizaciones(c.nValorizaciones)
    setDuracionSemanas(c.duracionSemanas)
    setNPersonas(c.nPersonas)
    setNPets(c.nPets)
    setAlcanceLibre(c.alcanceLibre)
    setActividades(borradorDisponible.propuestaActividades)
    setAdvertencias(borradorDisponible.advertencias)
    setEdtsPendientesIA(borradorDisponible.edtsPendientesIA)
    setFuenteEdtsSugeridos('restaurado')
    setPasoActual(borradorDisponible.propuestaActividades.length > 0 ? 2 : 1)
    setDecidiendoBorrador(false)
    contextoListoRef.current = true
    try {
      localStorage.removeItem(claveBorradorLocalPaso1(proyectoId))
    } catch {
      // no-op
    }
    toast({ title: 'Borrador restaurado', description: 'Seguís exactamente donde lo dejaste, sin regenerar nada con IA.' })
  }

  /** Igual que continuarBorrador pero para el draft liviano de localStorage (Paso 1 sin generacionId todavía). */
  function continuarBorradorLocal() {
    if (!borradorLocalDisponible) return
    const c = borradorLocalDisponible
    setEdtsSeleccionados(new Set(c.edtsSeleccionados))
    setBrownfield(c.brownfield)
    setIngenieriaDetalle(c.ingenieriaDetalle)
    setTableros(c.tableros)
    setPlcs(c.plcs)
    setHmiCantidad(c.hmiCantidad)
    setScada(c.scada)
    setNValorizaciones(c.nValorizaciones)
    setDuracionSemanas(c.duracionSemanas)
    setNPersonas(c.nPersonas)
    setNPets(c.nPets)
    setAlcanceLibre(c.alcanceLibre)
    setFuenteEdtsSugeridos('restaurado')
    setDecidiendoBorrador(false)
    setBorradorLocalDisponible(null)
    contextoListoRef.current = true
    toast({ title: 'Se restauró tu configuración del Paso 1', description: 'Seguías donde la dejaste antes de que se cerrara el asistente.' })
  }

  function empezarDeNuevo() {
    setDecidiendoBorrador(false)
    setBorradorDisponible(null)
    setBorradorLocalDisponible(null)
    try {
      localStorage.removeItem(claveBorradorLocalPaso1(proyectoId))
    } catch {
      // no-op
    }
    if (datosContexto) aplicarFlujoNormal(datosContexto, edts)
  }

  /** Botón "Restablecer" — descarta cualquier borrador (BD y local) y vuelve a la precarga limpia desde la cotización, con confirmación previa. */
  function restablecerWizard() {
    setMostrarConfirmarReset(false)
    const generacionAnterior = generacionId
    try {
      localStorage.removeItem(claveBorradorLocalPaso1(proyectoId))
    } catch {
      // no-op
    }
    if (generacionAnterior) {
      fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionAnterior}`, { method: 'DELETE' }).catch(() => {})
    }
    setGeneracionId(null)
    setActividades([])
    setAdvertencias([])
    setEdtsPendientesIA([])
    setBorradorDisponible(null)
    setBorradorLocalDisponible(null)
    setDecidiendoBorrador(false)
    setPasoActual(1)
    contextoListoRef.current = false
    if (datosContexto) aplicarFlujoNormal(datosContexto, edts)
    toast({ title: 'Asistente restablecido', description: 'Se recargó la configuración desde la cotización, sin tu progreso anterior.' })
  }

  useEffect(() => {
    if (!open) return

    // Ref, no state: debe quedar en false de forma síncrona e inmediata para
    // que el efecto de autoguardado (que puede correr en el mismo commit,
    // antes de que este fetch resuelva) no escriba un draft en blanco.
    contextoListoRef.current = false

    setPasoActual(1)
    setGeneracionId(null)
    setActividades([])
    setAdvertencias([])
    setAdvertenciasPrellenado([])
    setEdtsPendientesIA([])
    setDatosContexto(null)
    setBorradorDisponible(null)
    setBorradorLocalDisponible(null)
    setDecidiendoBorrador(false)
    setGuardadoPendiente(false)
    setUltimoGuardadoFallo(false)
    setCargandoContexto(true)

    fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard-contexto`)
      .then(async res => {
        if (!res.ok) throw new Error('No se pudo cargar el contexto del wizard')
        return res.json()
      })
      .then(
        (data: {
          edts: EdtWizardInfo[]
          cotizacionResumen: CotizacionResumen | null
          tieneCotizacionDocumento: boolean
          edtsSugeridosComercial: string[] | null
          edtsSugeridosConOrigen: EdtSugeridoConOrigen[] | null
          correccionesEdt: CorreccionEdt[]
          evidenciasCotizacion: EvidenciaTexto[]
          borrador: BorradorGeneracion | null
          borradorDescartado: boolean
        }) => {
          setEdts(data.edts)
          setCotizacionResumen(data.cotizacionResumen)
          setCorreccionesEdt(data.correccionesEdt)
          setEvidenciasCotizacion(data.evidenciasCotizacion)
          setCargandoContexto(false)

          const contexto: DatosContextoWizard = {
            edtsSugeridosComercial: data.edtsSugeridosComercial,
            edtsSugeridosConOrigen: data.edtsSugeridosConOrigen,
            cotizacionResumen: data.cotizacionResumen,
            tieneCotizacionDocumento: data.tieneCotizacionDocumento,
          }
          setDatosContexto(contexto)

          if (data.borradorDescartado) {
            toast({ title: 'Tu borrador anterior no era válido, se recargó desde la cotización' })
          }

          if (data.borrador) {
            // Hay una configuración guardada en BD — puede incluir propuestas
            // de IA ya generadas (costaron tokens). Se le pregunta al usuario
            // antes de sobreescribir nada con el flujo normal.
            setBorradorDisponible(data.borrador)
            setDecidiendoBorrador(true)
            return
          }

          // Sin borrador en BD, pero puede haber un draft liviano del Paso 1
          // en localStorage (wizard cerrado antes de generar actividades) —
          // se pregunta igual, nunca se restaura en silencio.
          const borradorLocal = leerBorradorLocal()
          if (borradorLocal) {
            setBorradorLocalDisponible(borradorLocal)
            setDecidiendoBorrador(true)
            return
          }

          aplicarFlujoNormal(contexto, data.edts)
        }
      )
      .catch(() => {
        toast({ title: 'Error cargando el contexto del wizard', variant: 'destructive' })
        setCargandoContexto(false)
        setCargandoPrellenado(false)
        // Sin contexto real no hay nada que precargar, pero el usuario puede
        // seguir configurando el Paso 1 a mano — a partir de acá sí es
        // seguro autoguardar lo que vaya escribiendo.
        contextoListoRef.current = true
      })
    // toast (useToast) no está memoizado: cambia de referencia en cada render, así que
    // incluirlo aquí reintroduce el loop infinito (efecto -> setState -> re-render -> nuevo
    // toast -> efecto de nuevo) que rompió producción — no agregarlo a este array. Lo mismo
    // aplica a aplicarFlujoNormal/leerBorradorLocal (se redefinen cada render, pero solo se
    // llaman de forma imperativa acá y desde los handlers de la pantalla de decisión — no
    // necesitan ser dependencia).
  }, [open, proyectoId])

  // Autoguardado del Paso 1 en localStorage — antes de que exista un
  // generacionId en BD no hay nada que persistir del lado del servidor, pero
  // perder esto en un cierre accidental es justo el bug reportado.
  useEffect(() => {
    if (!open || generacionId || decidiendoBorrador || cargandoContexto) return
    // Gate real de la condición de carrera (ver contextoListoRef arriba) —
    // sin esto, el primer pase de este efecto tras abrir el wizard podía
    // correr antes de que la precarga terminara y grabar un draft en blanco.
    if (!contextoListoRef.current) return
    // Nunca persiste un estado "en blanco/sin tocar" (cero EDTs marcados) —
    // ni la precarga real ni una interacción real del usuario dejan el Paso 1
    // así, así que solo puede pasar durante una carrera de hidratación.
    if (edtsSeleccionados.size === 0) return
    const payload: BorradorLocalPaso1 = {
      schemaVersion: BORRADOR_LOCAL_PASO1_VERSION,
      edtsSeleccionados: Array.from(edtsSeleccionados),
      brownfield,
      ingenieriaDetalle,
      tableros,
      plcs,
      hmiCantidad,
      scada,
      nValorizaciones,
      duracionSemanas,
      nPersonas,
      nPets,
      alcanceLibre,
    }
    try {
      localStorage.setItem(claveBorradorLocalPaso1(proyectoId), JSON.stringify(payload))
    } catch {
      // localStorage lleno/no disponible — no es crítico
    }
  }, [
    open,
    generacionId,
    decidiendoBorrador,
    cargandoContexto,
    edtsSeleccionados,
    brownfield,
    ingenieriaDetalle,
    tableros,
    plcs,
    hmiCantidad,
    scada,
    nValorizaciones,
    duracionSemanas,
    nPersonas,
    nPets,
    alcanceLibre,
    proyectoId,
  ])

  // Autoguardado del Paso 2 en BD — reusa el mismo PATCH que "Guardar
  // borrador", pero disparado automáticamente (debounced) en cada cambio del
  // árbol de Actividades, para no depender de que el usuario recuerde guardar.
  useEffect(() => {
    if (!open || !generacionId || pasoActual !== 2 || actividades.length === 0) return
    setGuardadoPendiente(true)
    const timer = setTimeout(() => {
      guardarActividades()
        .then(() => {
          setGuardadoPendiente(false)
          setUltimoGuardadoFallo(false)
        })
        .catch(() => {
          setGuardadoPendiente(false)
          setUltimoGuardadoFallo(true)
        })
    }, 1200)
    return () => clearTimeout(timer)
    // guardarActividades se redefine cada render pero solo lee closures
    // (generacionId/actividades/proyectoId) al momento de ejecutarse —
    // no hace falta como dependencia.
  }, [actividades, generacionId, pasoActual, open])

  function solicitarCierre() {
    if (guardadoPendiente || ultimoGuardadoFallo) {
      setMostrarConfirmarCierre(true)
      return
    }
    onOpenChange(false)
  }

  function confirmarCierreDeTodasFormas() {
    setMostrarConfirmarCierre(false)
    onOpenChange(false)
  }

  function toggleEdt(id: string) {
    setEdtsSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * Corrección manual a nivel PROYECTO (nunca toca la cotización real) para
   * casos como una partida mal clasificada al armar la cotización — ej.
   * "DESARROLLO DE PLANOS" cargado bajo ING en vez de PLA. Marca el EDT
   * como seleccionado y persiste el ajuste para que se recuerde la próxima
   * vez que se abra el wizard en este proyecto.
   */
  async function agregarCorreccion(edtId: string) {
    setGuardandoCorreccion(edtId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/edt-correcciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edtId, motivo: 'Agregado manualmente en el wizard de cronograma' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error guardando la corrección')
      }
      const data = await res.json()
      setCorreccionesEdt(prev => [...prev.filter(c => c.edtId !== edtId), data.correccion])
      setEdtsSeleccionados(prev => new Set(prev).add(edtId))
      toast({ title: 'Corrección guardada', description: 'Este EDT se va a sugerir siempre para este proyecto, sin tocar la cotización.' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGuardandoCorreccion(null)
    }
  }

  async function quitarCorreccion(correccionId: string, edtId: string) {
    setGuardandoCorreccion(edtId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/edt-correcciones/${correccionId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error quitando la corrección')
      }
      setCorreccionesEdt(prev => prev.filter(c => c.id !== correccionId))
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGuardandoCorreccion(null)
    }
  }

  /**
   * Detección proactiva de posible mal-tageo de EDT (heurística por
   * keywords, sin LLM) — se recalcula en vivo con la evidencia de la
   * cotización real MÁS lo que el usuario vaya escribiendo en la
   * descripción libre del alcance, y descarta cualquier EDT que ya esté
   * marcado (nada que confirmar ahí). Si el usuario lo marca a mano, el
   * botón de pin ya existente se encarga de guardarlo como corrección.
   */
  const edtsPosiblesDetectados = useMemo(() => {
    const evidencias: EvidenciaTexto[] = [...evidenciasCotizacion, { texto: alcanceLibre, origen: 'Descripción libre del alcance' }]
    return detectarEdtsPosibles(evidencias).filter(d => {
      const edt = edts.find(e => e.nombre === d.edtNombre)
      // Nada que confirmar si ya está marcado, o si ya hay un origen que lo
      // explica (cotización/regla/corrección) — evita un doble badge confuso.
      return edt && !edtsSeleccionados.has(edt.id) && !edtsOrigen.has(edt.id)
    })
  }, [evidenciasCotizacion, alcanceLibre, edts, edtsSeleccionados, edtsOrigen])

  function agregarTablero() {
    setTableros(prev => [...prev, { nombre: '' }])
  }
  function actualizarTablero(i: number, nombre: string) {
    setTableros(prev => prev.map((t, idx) => (idx === i ? { nombre } : t)))
  }
  function quitarTablero(i: number) {
    setTableros(prev => prev.filter((_, idx) => idx !== i))
  }

  function agregarPlc() {
    setPlcs(prev => [...prev, { nombre: '' }])
  }
  function actualizarPlc(i: number, nombre: string) {
    setPlcs(prev => prev.map((p, idx) => (idx === i ? { nombre } : p)))
  }
  function quitarPlc(i: number) {
    setPlcs(prev => prev.filter((_, idx) => idx !== i))
  }

  function puedeAvanzar() {
    if (decidiendoBorrador) return false
    if (pasoActual === 1) return edtsSeleccionados.size > 0 && !generandoPaso1
    if (pasoActual === 2) return actividades.length > 0 && !guardandoPaso2 && !generandoIA && !aplicandoCronograma
    return false
  }
  function puedeAplicarCronograma() {
    return puedeAvanzar() && edtsPendientesIA.length === 0
  }
  function puedeRetroceder() {
    return pasoActual > 1 && !generandoPaso1 && !guardandoPaso2 && !generandoIA && !aplicandoCronograma
  }

  async function generarPropuesta() {
    setGenerandoPaso1(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/configuracion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edtsSeleccionados: Array.from(edtsSeleccionados),
          brownfield,
          ingenieriaDetalle,
          tableros: tableros.filter(t => t.nombre.trim()),
          plcs: plcs.filter(p => p.nombre.trim()),
          hmiCantidad,
          scada,
          nValorizaciones,
          duracionSemanas,
          nPersonas,
          nPets,
          alcanceLibre,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando la propuesta de actividades')
      }
      const data = await res.json()
      setGeneracionId(data.generacionId)
      setActividades(data.propuestaActividades)
      setAdvertencias(data.advertencias ?? [])
      setEdtsPendientesIA(data.edtsPendientesIA ?? [])
      setPasoActual(2)
      // A partir de acá el borrador vive en BD (autoguardado del Paso 2) — el
      // draft local del Paso 1 queda obsoleto.
      localStorage.removeItem(claveBorradorLocalPaso1(proyectoId))
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGenerandoPaso1(false)
    }
  }

  async function guardarActividades(): Promise<boolean> {
    if (!generacionId) return false
    const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/actividades`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actividades),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error guardando el borrador')
    }
    return true
  }

  async function guardarBorrador() {
    setGuardandoPaso2(true)
    try {
      await guardarActividades()
      toast({ title: 'Borrador guardado', description: 'Podrás retomarlo y aplicarlo al cronograma más tarde.' })
      onSuccess?.()
      onOpenChange(false)
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGuardandoPaso2(false)
    }
  }

  async function aplicarCronograma() {
    if (!generacionId) return
    // Advertir, nunca bloquear: si quedan tareas incluidas en "Sin agrupar",
    // el usuario decide si aplica igual o vuelve a revisar.
    const sinAgrupar = actividades.find(a => a.actividadNombre === 'Sin agrupar' && a.tareas.some(t => t.incluida))
    if (sinAgrupar) {
      toast({
        title: 'Hay tareas sin zona asignada',
        description: `"Sin agrupar" tiene ${sinAgrupar.tareas.filter(t => t.incluida).length} tarea(s) incluida(s) — se van a generar igual. Podés moverlas a otra Actividad antes de aplicar.`,
      })
    }
    setAplicandoCronograma(true)
    try {
      await guardarActividades()
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/generar`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error aplicando el cronograma')
      }
      const data = await res.json()
      toast({
        title: 'Cronograma generado',
        description: `${data.resultado.fasesCreadas} fases, ${data.resultado.edtsCreados} EDTs, ${data.resultado.actividadesCreadas} actividades, ${data.resultado.tareasCreadas} tareas.`,
      })
      onSuccess?.()
      // No cierra directo: abre la propuesta de autoasignación de
      // responsables (Matriz de Comunicación) — sigue exigiendo la
      // confirmación explícita del usuario, solo evita que tenga que ir a
      // buscar el botón manual.
      setCronogramaIdAplicado(data.cronogramaId)
      onOpenChange(false)
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setAplicandoCronograma(false)
    }
  }

  async function generarConIA() {
    if (!generacionId) return
    setGenerandoIA(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/proponer-actividades-ia`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando la propuesta de IA')
      }
      const data = await res.json()
      setActividades(data.propuestaActividades)
      setAdvertencias(data.advertencias ?? [])
      setEdtsPendientesIA([])
      toast({ title: 'Propuesta de IA generada', description: 'Revisa y edita las zonas/familias antes de aplicar.' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGenerandoIA(false)
    }
  }

  function avanzarPaso() {
    if (pasoActual === 1) {
      generarPropuesta()
    }
  }

  function retrocederPaso() {
    setPasoActual(p => Math.max(1, p - 1))
  }

  function renombrarActividad(index: number, nombre: string) {
    setActividades(prev => prev.map((a, i) => (i === index ? { ...a, actividadNombre: nombre } : a)))
  }
  function eliminarActividad(index: number) {
    setActividades(prev => prev.filter((_, i) => i !== index))
  }
  /**
   * "Eliminar" una tarea y "excluirla" son la misma acción (reversible): en
   * vez de sacarla del árbol, se desmarca incluida — el Paso 4 ya filtra por
   * incluida antes de generar, así que el efecto es idéntico pero el usuario
   * puede arrepentirse sin tener que regenerar nada.
   */
  function toggleTarea(actividadIndex: number, tareaIndex: number, incluida: boolean) {
    setActividades(prev =>
      prev.map((a, i) =>
        i === actividadIndex
          ? { ...a, tareas: a.tareas.map((t, ti) => (ti === tareaIndex ? { ...t, incluida } : t)) }
          : a
      )
    )
  }

  /**
   * Reasignación manual: mueve una tarea de una Actividad a otra del mismo
   * EDT (incluye "Sin agrupar" como origen o destino) — para cuando la IA no
   * ubicó bien una tarea, sin tener que regenerar toda la propuesta.
   */
  function moverTarea(actividadOrigenIndex: number, tareaIndex: number, actividadDestinoIndex: number) {
    if (actividadOrigenIndex === actividadDestinoIndex) return
    setActividades(prev => {
      const tarea = prev[actividadOrigenIndex]?.tareas[tareaIndex]
      if (!tarea) return prev
      return prev.map((a, i) => {
        if (i === actividadOrigenIndex) return { ...a, tareas: a.tareas.filter((_, ti) => ti !== tareaIndex) }
        if (i === actividadDestinoIndex) return { ...a, tareas: [...a.tareas, tarea] }
        return a
      })
    })
  }

  const progreso = (pasoActual / PASOS.length) * 100

  function renderPasoActual() {
    if (cargandoContexto) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Cargando EDTs del catálogo...
        </div>
      )
    }

    if (decidiendoBorrador && (borradorDisponible || borradorLocalDisponible)) {
      const tieneIA = borradorDisponible?.propuestaActividades.some(a => a.origen === 'ia') ?? false
      return (
        <div className="space-y-4 py-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            Hay una configuración guardada para este proyecto
          </div>
          <p className="text-sm text-muted-foreground">
            {borradorDisponible
              ? borradorDisponible.propuestaActividades.length > 0
                ? `Tiene ${borradorDisponible.propuestaActividades.length} Actividad(es) ya propuesta(s)${tieneIA ? ', incluidas propuestas de IA (ya generadas, sin costo adicional si continúas)' : ''}.`
                : 'Tiene las respuestas del Paso 1 guardadas, todavía sin actividades generadas.'
              : 'Quedaron guardadas las respuestas del Paso 1 de la última vez que abriste el asistente, antes de generar actividades.'}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={empezarDeNuevo}>
              Empezar de nuevo
            </Button>
            <Button size="sm" onClick={borradorDisponible ? continuarBorrador : continuarBorradorLocal}>
              Continuar donde quedaste
            </Button>
          </div>
        </div>
      )
    }

    if (pasoActual === 1) {
      return (
        <div className="space-y-5">
          {cotizacionResumen && (
            <Alert>
              <FileCheck2 className="h-4 w-4" />
              <AlertDescription>
                Se encontró una cotización extraída para este proyecto
                {cotizacionResumen.numeroPropuesta ? ` (${cotizacionResumen.numeroPropuesta})` : ''}.{' '}
                {cargandoPrellenado ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />La IA está sugiriendo los EDTs y parámetros del Paso 1 a partir de su alcance real...</span>
                ) : (
                  'La IA sugirió los EDTs y parámetros de abajo a partir de su alcance real — revisa y edita lo que necesites.'
                )}
              </AlertDescription>
            </Alert>
          )}

          {advertenciasPrellenado.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-0.5">
                  {advertenciasPrellenado.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>EDTs a incluir</Label>
              {fuenteEdtsSugeridos === 'comercial' && (
                <Badge variant="secondary" className="text-xs">Sugerido desde tu cotización comercial</Badge>
              )}
              {fuenteEdtsSugeridos === 'ia' && (
                <Badge variant="outline" className="text-xs">Sugerido por IA — sin cotización comercial, revisa con cuidado</Badge>
              )}
              {fuenteEdtsSugeridos === 'manual' && (
                <Badge variant="outline" className="text-xs">Sin cotización — selecciona manualmente</Badge>
              )}
              {fuenteEdtsSugeridos === 'restaurado' && (
                <Badge variant="secondary" className="text-xs">Restaurado desde tu configuración guardada</Badge>
              )}
            </div>
            <Card>
              <CardContent className="p-2 max-h-[220px] overflow-y-auto space-y-1">
                {edts.map(edt => {
                  const origen = edtsOrigen.get(edt.id)
                  const correccion = correccionesEdt.find(c => c.edtId === edt.id)
                  const posible = edtsPosiblesDetectados.find(d => d.edtNombre === edt.nombre)
                  // Ofrecer "recordar" solo si el usuario lo marcó a mano sin ninguna
                  // señal (ni cotización ni regla) — es exactamente el caso de una
                  // partida mal clasificada en la cotización (ej. G300: PLA).
                  const puedeMarcarCorreccion = !origen && !correccion && edtsSeleccionados.has(edt.id)
                  return (
                    <div
                      key={edt.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleEdt(edt.id)}
                    >
                      <Checkbox checked={edtsSeleccionados.has(edt.id)} onCheckedChange={() => toggleEdt(edt.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{edt.descripcion || edt.nombre} ({edt.nombre})</p>
                        <p className="text-xs text-muted-foreground truncate">{edt.faseNombre ?? 'Sin fase asignada'}</p>
                      </div>
                      {origen && origen.origen !== 'cotizacion' && (
                        <Badge
                          variant={origen.origen === 'regla-sugerencia' ? 'outline' : 'secondary'}
                          className="text-[10px] shrink-0"
                          title={origen.motivo}
                        >
                          {origen.origen === 'regla-siempre' && 'Siempre aplica'}
                          {origen.origen === 'regla-derivada' && 'Derivado del alcance'}
                          {origen.origen === 'regla-sugerencia' && 'Sugerido — confirma'}
                          {origen.origen === 'correccion-proyecto' && 'Corrección de este proyecto'}
                        </Badge>
                      )}
                      {posible && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500 text-amber-600" title={posible.motivo}>
                          Posible según cotización — confirma
                        </Badge>
                      )}
                      {correccion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          title="Quitar corrección de este proyecto (no afecta la cotización)"
                          disabled={guardandoCorreccion === edt.id}
                          onClick={e => {
                            e.stopPropagation()
                            quitarCorreccion(correccion.id, edt.id)
                          }}
                        >
                          <PinOff className="h-3 w-3" />
                        </Button>
                      )}
                      {puedeMarcarCorreccion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
                          title="Recordar este EDT para este proyecto (no toca la cotización comercial)"
                          disabled={guardandoCorreccion === edt.id}
                          onClick={e => {
                            e.stopPropagation()
                            agregarCorreccion(edt.id)
                          }}
                        >
                          <Pin className="h-3 w-3" />
                        </Button>
                      )}
                      <Badge variant={edt.totalServicios > 0 ? 'secondary' : 'outline'} className="text-xs">
                        {edt.totalServicios} servicios
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Planta existente (brownfield)</Label>
                <p className="text-xs text-muted-foreground">Activa tareas exclusivas de instalaciones operativas</p>
              </div>
              <Switch checked={brownfield} onCheckedChange={setBrownfield} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Ingeniería de detalle</Label>
                <p className="text-xs text-muted-foreground">Activa tareas exclusivas de contratos con detalle</p>
              </div>
              <Switch checked={ingenieriaDetalle} onCheckedChange={setIngenieriaDetalle} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tableros</Label>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={agregarTablero}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
            <div className="space-y-1.5">
              {tableros.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={t.nombre} onChange={e => actualizarTablero(i, e.target.value)} placeholder="Ej: TCO-CMN-QUI-007" className="h-8 text-sm" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => quitarTablero(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {tableros.length === 0 && <p className="text-xs text-muted-foreground">Sin tableros — omite si el proyecto no incluye PLA/TAB.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>PLCs / Controladores</Label>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={agregarPlc}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>
            <div className="space-y-1.5">
              {plcs.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={p.nombre} onChange={e => actualizarPlc(i, e.target.value)} placeholder="Ej: PLC Balanza 220" className="h-8 text-sm" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => quitarPlc(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {plcs.length === 0 && <p className="text-xs text-muted-foreground">Sin PLCs — omite si el proyecto no incluye PLC.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <Label className="text-sm">N° de estaciones HMI</Label>
              <Input type="number" min={0} value={hmiCantidad} onChange={e => setHmiCantidad(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Integración a SCADA existente</Label>
              <Switch checked={scada} onCheckedChange={setScada} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">N° valorizaciones intermedias</Label>
              <Input type="number" min={0} value={nValorizaciones} onChange={e => setNValorizaciones(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-sm">Duración estimada (semanas)</Label>
              <Input type="number" min={0} value={duracionSemanas} onChange={e => setDuracionSemanas(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-sm">N° de personas a habilitar</Label>
              <Input type="number" min={0} value={nPersonas} onChange={e => setNPersonas(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
            <div>
              <Label className="text-sm">N° de PETS</Label>
              <Input type="number" min={0} value={nPets} onChange={e => setNPets(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-sm">Descripción libre del alcance</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Usado por la IA para proponer zonas de construcción y familias de procura (Bloque D).</p>
            <Textarea value={alcanceLibre} onChange={e => setAlcanceLibre(e.target.value)} rows={4} placeholder="Ej: instalación eléctrica en sala de tanques y zona de bombas..." />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {edtsPendientesIA.length > 0 && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                {edtsPendientesIA.map(e => e.nombre).join(', ')} requiere{edtsPendientesIA.length > 1 ? 'n' : ''} una
                propuesta de zonas/familias con IA antes de guardar.
              </span>
              <Button size="sm" onClick={generarConIA} disabled={generandoIA} className="shrink-0">
                {generandoIA ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-1" />Generar con IA</>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {advertencias.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-0.5">
                {advertencias.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {edtsPendientesIA.length > 0 && (
          <div className="space-y-2">
            {edtsPendientesIA.map(edt => (
              <div key={edt.id} className="flex items-center gap-2 py-2 px-3 border border-dashed rounded-lg text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">{edt.nombre}</Badge>
                <Sparkles className="h-3.5 w-3.5" />
                <span className="flex-1">Pendiente de generar con IA — usa el botón &quot;Generar con IA&quot; de arriba</span>
              </div>
            ))}
          </div>
        )}

        <Accordion type="multiple" className="space-y-2">
          {actividades.map((actividad, index) => (
            <AccordionItem key={index} value={String(index)} className="border rounded-lg px-3">
              <div className="flex items-center gap-2 py-1">
                <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <Badge variant="outline" className="text-xs">{actividad.edtNombre}</Badge>
                    <span className="font-medium text-sm">{actividad.actividadNombre}</span>
                    <Badge variant="secondary" className="text-xs">
                      {actividad.tareas.filter(t => t.incluida).length}/{actividad.tareas.length} tareas
                    </Badge>
                    {actividad.actividadNombre === 'Sin agrupar' && (
                      <Badge
                        variant="destructive"
                        className="text-[10px]"
                        title="La IA no supo en qué zona ubicar estas tareas — muévelas a la Actividad que corresponda o déjalas acá. No bloquea aplicar el cronograma."
                      >
                        Revisar — sin zona asignada
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => eliminarActividad(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <AccordionContent className="pb-3 space-y-2">
                <Input
                  value={actividad.actividadNombre}
                  onChange={e => renombrarActividad(index, e.target.value)}
                  className="h-8 text-sm mb-2"
                />
                <div className="space-y-1">
                  {(() => {
                    const destinos = actividades
                      .map((a, ai) => ({ ai, nombre: a.actividadNombre }))
                      .filter(d => d.ai !== index && actividades[d.ai].edtNombre === actividad.edtNombre)
                    return actividad.tareas.map((tarea, ti) => (
                      <div
                        key={tarea.catalogoServicioId}
                        className="flex items-start gap-2 text-xs p-1.5 rounded cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleTarea(index, ti, !tarea.incluida)}
                      >
                        <Checkbox
                          checked={tarea.incluida}
                          onCheckedChange={checked => toggleTarea(index, ti, checked === true)}
                          onClick={e => e.stopPropagation()}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={tarea.incluida ? '' : 'text-muted-foreground'}>{tarea.nombre}</p>
                          {tarea.motivoExclusion && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{tarea.motivoExclusion}</p>
                          )}
                        </div>
                        <span className="text-muted-foreground shrink-0">{tarea.horasEstimadas.toFixed(1)}h</span>
                        {destinos.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                title="Mover a otra Actividad"
                                onClick={e => e.stopPropagation()}
                              >
                                <FolderInput className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuLabel className="text-xs">Mover a...</DropdownMenuLabel>
                              {destinos.map(d => (
                                <DropdownMenuItem key={d.ai} onSelect={() => moverTarea(index, ti, d.ai)}>
                                  {d.nombre}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {actividades.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se generó ninguna Actividad con los EDTs y filtros seleccionados.</p>
        )}
      </div>
    )
  }

  const content = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Paso {pasoActual}/{PASOS.length}</span>
            <span className="font-medium text-sm">{PASOS[pasoActual - 1]}</span>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0.5">{Math.round(progreso)}%</Badge>
        </div>
        <Progress value={progreso} className="w-full h-1.5" />
      </div>

      <div className="min-h-[300px]">{renderPasoActual()}</div>

      <div className="flex justify-between pt-2 border-t">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={solicitarCierre}>
            Cancelar
          </Button>
          <Button variant="ghost" size="sm" onClick={retrocederPaso} disabled={!puedeRetroceder()}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {!cargandoContexto && !decidiendoBorrador && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              title="Descarta tu progreso guardado y vuelve a precargar desde la cotización"
              onClick={() => setMostrarConfirmarReset(true)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restablecer
            </Button>
          )}
        </div>

        {!decidiendoBorrador && (pasoActual === 1 ? (
          <Button size="sm" onClick={avanzarPaso} disabled={!puedeAvanzar()}>
            {generandoPaso1 ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
            ) : (
              <>Proponer actividades<ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {guardadoPendiente && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />Guardando...
              </span>
            )}
            <Button size="sm" variant="outline" onClick={guardarBorrador} disabled={!puedeAvanzar()}>
              {guardandoPaso2 ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Guardando...</>
              ) : (
                <>Guardar borrador</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={aplicarCronograma}
              disabled={!puedeAplicarCronograma()}
              className="bg-green-600 hover:bg-green-700"
              title={edtsPendientesIA.length > 0 ? 'Genera primero las zonas/familias con IA para los EDTs pendientes' : undefined}
            >
              {aplicandoCronograma ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Aplicando...</>
              ) : (
                <>Aplicar al Cronograma</>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!next) solicitarCierre()
          else onOpenChange(next)
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generar Cronograma con IA
            </DialogTitle>
            <DialogDescription>
              La IA solo redacta agrupaciones y sugerencias — la estructura y los datos vienen del catálogo real. Nada se aplica al cronograma sin tu revisión.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      <AlertDialog open={mostrarConfirmarCierre} onOpenChange={setMostrarConfirmarCierre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              {ultimoGuardadoFallo
                ? 'El último cambio no se pudo guardar automáticamente. Si cierras ahora, se perderá.'
                : 'Todavía se está guardando tu último cambio. Si cierras ahora, podría perderse.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarCierreDeTodasFormas}>Cerrar de todas formas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={mostrarConfirmarReset} onOpenChange={setMostrarConfirmarReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer el asistente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se descarta todo tu progreso guardado en este proyecto (Paso 1 y, si ya generaste actividades, también el Paso 2) y se vuelve a precargar desde cero a partir de la cotización. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={restablecerWizard}>Restablecer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {cronogramaIdAplicado && (
        <AutoasignarResponsablesModal
          open={!!cronogramaIdAplicado}
          onOpenChange={next => {
            if (!next) setCronogramaIdAplicado(null)
          }}
          proyectoId={proyectoId}
          cronogramaId={cronogramaIdAplicado}
          onSuccess={() => {
            onSuccess?.()
            setCronogramaIdAplicado(null)
          }}
        />
      )}
    </>
  )
}
