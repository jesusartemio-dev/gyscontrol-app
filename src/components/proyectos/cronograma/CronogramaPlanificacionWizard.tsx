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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Sparkles, AlertCircle, FileCheck2, History, Pin, PinOff, FolderInput, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ActividadPropuesta, ConfiguracionWizardPaso1, EsquemaAgrupacionPropuesto } from '@/types/cronogramaIA'
import type { EdtSugeridoConOrigen } from '@/lib/cronogramaIA/derivarEdtsSoporte'
import { detectarEdtsPosibles, type EvidenciaTexto } from '@/lib/cronogramaIA/detectarEdtsPosibles'
import { EDTS_AGRUPACION_UN_PASO, EDTS_ESQUEMA_DOS_ETAPAS, calcularEdtsPendientesIA, tieneAlMenosUnaTareaIncluida } from '@/lib/cronogramaIA/reglasActividades'
import { agruparYOrdenarPorEstructura, type InfoOrdenEdt } from '@/lib/cronogramaIA/agruparYOrdenarPorEstructura'
import { derivarAliasCandidato } from '@/lib/cronogramaIA/aliasActividad'
import { ROL_RESPONSABLE_LABELS, type RolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'
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
  /** Orden real del catálogo (Fase.orden / Edt.orden) — usado para que el Paso 2 liste las Actividades en el mismo orden final del cronograma. */
  faseOrden: number | null
  edtOrden: number
  totalServicios: number
}

interface FormaPagoCotizacion {
  tipo: 'valorizaciones_mensuales' | 'hitos' | 'contra_entrega' | 'anticipo_saldo' | 'otro' | null
  numeroValorizaciones: number | null
  descripcion: string | null
}

interface CotizacionResumen {
  numeroPropuesta: string | null
  clienteDetectado: string | null
  resumenAlcance: string[]
  exclusiones: string[]
  formaPago: FormaPagoCotizacion | null
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
  /** Solo existencia — el TDR nunca cambia qué EDTs se sugieren, ver wizard-contexto/route.ts. */
  tieneTdr: boolean
}

interface OrganigramaResumen {
  tieneOrganigrama: boolean
  rolesDetectados: number
  rolesFaltantes: string[]
}

interface ResponsablePreviewDesglose {
  rol: RolResponsable
  responsableUserId: string | null
  responsableNombre: string | null
  tareasCount: number
}

interface ResponsablePreviewEdt {
  edtNombre: string
  edtCodigo: string
  desglose: ResponsablePreviewDesglose[]
  advertencia: string | null
}

interface Props {
  proyectoId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/** Nombre + alias de un esquema en edición — `aliasManual` evita que el re-cálculo de alias al renombrar pise un alias que el usuario ya editó a mano. */
interface NombreEditableEsquema {
  nombre: string
  alias: string
  aliasManual?: boolean
  /** Solo relevante para familias de PRO — ver NOMBRE_FAMILIA_OFICIAL_PRO. Ya viene corregido por el servidor, nunca se recalcula en el cliente. */
  fueraDeVocabulario?: boolean
  justificacion?: string
}

const PASOS = ['Alcance del proyecto', 'Actividades propuestas']

export function CronogramaPlanificacionWizard({ proyectoId, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast()
  const [pasoActual, setPasoActual] = useState(1)

  const [cargandoContexto, setCargandoContexto] = useState(false)
  const [cargandoPrellenado, setCargandoPrellenado] = useState(false)
  const [edts, setEdts] = useState<EdtWizardInfo[]>([])
  const [cotizacionResumen, setCotizacionResumen] = useState<CotizacionResumen | null>(null)
  /** Solo existencia — nunca cambia sugerencias de EDT, solo habilita un badge informativo. */
  const [tieneTdr, setTieneTdr] = useState(false)
  const [advertenciasPrellenado, setAdvertenciasPrellenado] = useState<string[]>([])

  const [edtsSeleccionados, setEdtsSeleccionados] = useState<Set<string>>(new Set())
  const [brownfield, setBrownfield] = useState(false)
  const [ingenieriaDetalle, setIngenieriaDetalle] = useState(false)
  const [tableros, setTableros] = useState<{ nombre: string }[]>([])
  const [plcs, setPlcs] = useState<{ nombre: string }[]>([])
  const [hmiCantidad, setHmiCantidad] = useState(0)
  const [scada, setScada] = useState(false)
  const [nValorizaciones, setNValorizaciones] = useState(0)
  const [valorizacionesTocadas, setValorizacionesTocadas] = useState(false)
  const [duracionSemanas, setDuracionSemanas] = useState(0)
  const [nPersonas, setNPersonas] = useState(0)
  const [nPets, setNPets] = useState(1) // norma de la empresa
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
  const [organigramaResumen, setOrganigramaResumen] = useState<OrganigramaResumen | null>(null)

  // Flujo de esquemas en 2 etapas (CON/PRO) — Etapa A: 2-3 esquemas
  // alternativos por EDT (sin tareas); Etapa B: el usuario elige/edita uno y
  // recién ahí se asignan tareas. mostrandoEsquemas gatea una sub-vista
  // dentro del Paso 2, antes del acordeón final de Actividades.
  const [esquemasPorEdt, setEsquemasPorEdt] = useState<Record<string, EsquemaAgrupacionPropuesto[]>>({})
  const [indiceElegido, setIndiceElegido] = useState<Record<string, number | null>>({})
  const [nombresEditables, setNombresEditables] = useState<Record<string, NombreEditableEsquema[]>>({})
  const [mostrandoEsquemas, setMostrandoEsquemas] = useState(false)
  const [confirmandoEsquemas, setConfirmandoEsquemas] = useState(false)
  const [previewResponsables, setPreviewResponsables] = useState<ResponsablePreviewEdt[]>([])
  const [cargandoPreviewResponsables, setCargandoPreviewResponsables] = useState(false)

  // Persistencia del wizard (evita perder Paso 1/Paso 2/propuestas de IA por un cierre accidental).
  const [datosContexto, setDatosContexto] = useState<DatosContextoWizard | null>(null)
  const [borradorDisponible, setBorradorDisponible] = useState<BorradorGeneracion | null>(null)
  const [borradorLocalDisponible, setBorradorLocalDisponible] = useState<BorradorLocalPaso1 | null>(null)
  const [decidiendoBorrador, setDecidiendoBorrador] = useState(false)
  const [guardadoPendiente, setGuardadoPendiente] = useState(false)
  const [ultimoGuardadoFallo, setUltimoGuardadoFallo] = useState(false)
  const [mostrarConfirmarCierre, setMostrarConfirmarCierre] = useState(false)
  const [mostrarConfirmarReset, setMostrarConfirmarReset] = useState(false)

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
    setValorizacionesTocadas(true) // restaurado tal cual, no recalcular con la fórmula por encima
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
    setValorizacionesTocadas(true) // restaurado tal cual, no recalcular con la fórmula por encima
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
          tieneTdr: boolean
          edtsSugeridosComercial: string[] | null
          edtsSugeridosConOrigen: EdtSugeridoConOrigen[] | null
          correccionesEdt: CorreccionEdt[]
          evidenciasCotizacion: EvidenciaTexto[]
          borrador: BorradorGeneracion | null
          borradorDescartado: boolean
          organigramaResumen: OrganigramaResumen
        }) => {
          setEdts(data.edts)
          setCotizacionResumen(data.cotizacionResumen)
          setTieneTdr(data.tieneTdr)
          setCorreccionesEdt(data.correccionesEdt)
          setEvidenciasCotizacion(data.evidenciasCotizacion)
          setOrganigramaResumen(data.organigramaResumen)
          setCargandoContexto(false)

          const contexto: DatosContextoWizard = {
            edtsSugeridosComercial: data.edtsSugeridosComercial,
            edtsSugeridosConOrigen: data.edtsSugeridosConOrigen,
            cotizacionResumen: data.cotizacionResumen,
            tieneCotizacionDocumento: data.tieneCotizacionDocumento,
            tieneTdr: data.tieneTdr,
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

  // `edtsSeleccionados` guarda ids (no códigos) — este mapa permite
  // preguntar "¿está PLA/TAB/PLC/HMI/SEG marcado?" para mostrar solo los
  // campos del Paso 1 que de verdad aplican a los EDTs elegidos.
  const edtIdPorNombre = useMemo(() => new Map(edts.map(e => [e.nombre, e.id])), [edts])
  function edtEstaSeleccionada(nombre: string): boolean {
    const id = edtIdPorNombre.get(nombre)
    return id ? edtsSeleccionados.has(id) : false
  }

  // EDTs cuyas Actividades quedaron TODAS con 0 tareas incluidas — no van a
  // aportar nada al cronograma aplicado, aunque el EDT siga seleccionado.
  const edtsSinTareasIncluidas = useMemo(() => {
    const tieneAlgunaPorEdt = new Map<string, boolean>()
    for (const a of actividades) {
      const yaTieneAlguna = tieneAlgunaPorEdt.get(a.edtNombre) ?? false
      tieneAlgunaPorEdt.set(a.edtNombre, yaTieneAlguna || tieneAlMenosUnaTareaIncluida(a.tareas))
    }
    return Array.from(tieneAlgunaPorEdt.entries())
      .filter(([, tieneAlguna]) => !tieneAlguna)
      .map(([edtNombre]) => edtNombre)
  }, [actividades])

  // El Paso 2 debe ser un preview fiel del árbol final: mismo orden Fase ->
  // EDT.orden -> orden natural dentro del EDT que construirEstructuraReal
  // usa al aplicar de verdad — una sola fuente de verdad para el criterio
  // (agruparYOrdenarPorEstructura), nunca un criterio de orden duplicado acá.
  const actividadesOrdenadas = useMemo(() => {
    const edtsCatalogo = new Map<string, InfoOrdenEdt>()
    for (const e of edts) {
      if (e.faseNombre === null || e.faseOrden === null) continue
      edtsCatalogo.set(e.nombre, { nombre: e.nombre, faseNombre: e.faseNombre, faseOrden: e.faseOrden, edtOrden: e.edtOrden })
    }
    const { gruposOrdenados } = agruparYOrdenarPorEstructura(actividades, edtsCatalogo)

    // Los índices se resuelven por referencia de objeto (misma instancia que
    // en `actividades`) — todo el resto del componente (toggleTarea,
    // renombrarActividad, eliminarActividad, moverTarea...) sigue indexando
    // sobre el array original, así que el índice real debe preservarse.
    const indicePorActividad = new Map(actividades.map((a, i) => [a, i] as const))
    const ordenadas: { actividad: ActividadPropuesta; index: number }[] = []
    for (const grupo of gruposOrdenados) {
      for (const actividad of grupo.actividades) {
        const index = indicePorActividad.get(actividad)
        if (index !== undefined) ordenadas.push({ actividad, index })
      }
    }
    // EDT no encontrado en el catálogo (advertencia ya la emite
    // agruparYOrdenarPorEstructura) — nunca esconder la Actividad, se
    // muestra al final en vez de desaparecer del preview.
    const indicesYaMostrados = new Set(ordenadas.map(o => o.index))
    actividades.forEach((actividad, index) => {
      if (!indicesYaMostrados.has(index)) ordenadas.push({ actividad, index })
    })
    return ordenadas
  }, [actividades, edts])

  // La norma es valorización mensual, con la última viviendo en CIE (por
  // eso el -1) — el usuario no suele conocer el N° exacto de antemano.
  function sugerirValorizaciones(semanas: number): number {
    return Math.max(0, Math.round(semanas / 4.33) - 1)
  }

  // Recalcula en vivo mientras el usuario escribe la duración — pero deja de
  // tocar el campo apenas lo edita a mano (ver setValorizacionesTocadas en el
  // input). La cotización (si trae una forma de pago con N° de
  // valorizaciones detectado) manda sobre la fórmula.
  useEffect(() => {
    if (valorizacionesTocadas) return
    const detectadoEnCotizacion = cotizacionResumen?.formaPago?.numeroValorizaciones
    setNValorizaciones(detectadoEnCotizacion != null ? detectadoEnCotizacion : sugerirValorizaciones(duracionSemanas))
  }, [duracionSemanas, cotizacionResumen, valorizacionesTocadas])

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
      // Evita arrastrar esquemas propuestos/elegidos de una vuelta anterior
      // al Paso 1 (ej. "Anterior" y volver a "Proponer actividades").
      setEsquemasPorEdt({})
      setIndiceElegido({})
      setNombresEditables({})
      setMostrandoEsquemas(false)
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

  async function cargarPreviewResponsables(actividadesActuales: ActividadPropuesta[]) {
    if (actividadesActuales.length === 0) {
      setPreviewResponsables([])
      return
    }
    setCargandoPreviewResponsables(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/preview-responsables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actividades: actividadesActuales }),
      })
      if (!res.ok) return
      const data = await res.json()
      setPreviewResponsables(data.preview ?? [])
    } catch {
      // Preview best-effort — nunca bloquea el flujo de aplicar el cronograma.
    } finally {
      setCargandoPreviewResponsables(false)
    }
  }

  useEffect(() => {
    if (pasoActual === 2) cargarPreviewResponsables(actividades)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasoActual])

  /** Mensaje legible a partir de un error de API — incluye el detalle de validación del servidor (ej. zod) si viene, nunca falla en silencio. */
  function mensajeErrorServidor(err: { error?: string; detalles?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } }, fallback: string): string {
    const base = err.error || fallback
    const detalles = err.detalles
    if (!detalles) return base
    const partes = [...(detalles.formErrors ?? []), ...Object.entries(detalles.fieldErrors ?? {}).flatMap(([campo, msgs]) => msgs.map(m => `${campo}: ${m}`))]
    return partes.length > 0 ? `${base} — ${partes.join('; ')}` : base
  }

  async function guardarActividades(actividadesAGuardar: ActividadPropuesta[] = actividades): Promise<boolean> {
    if (!generacionId) return false
    const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/actividades`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actividadesAGuardar),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(mensajeErrorServidor(err, 'Error guardando el borrador'))
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
      toast({ title: 'No se pudo guardar el borrador', description: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
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
    // Regla de negocio: una Actividad con 0 tareas incluidas no se crea en
    // el cronograma — se filtra acá (servidor también la tolera si llegara)
    // para que lo persistido antes de aplicar refleje lo que va a pasar.
    const actividadesParaAplicar = actividades.filter(a => tieneAlMenosUnaTareaIncluida(a.tareas))
    setAplicandoCronograma(true)
    try {
      await guardarActividades(actividadesParaAplicar)
      const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/generar`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(mensajeErrorServidor(err, 'Error aplicando el cronograma'))
      }
      const data = await res.json()
      const responsablesTexto =
        typeof data.resultado.responsablesAsignados === 'number'
          ? ` ${data.resultado.responsablesAsignados} responsable(s) autoasignado(s) desde el organigrama.`
          : ''
      toast({
        title: 'Cronograma generado',
        description: `${data.resultado.fasesCreadas} fases, ${data.resultado.edtsCreados} EDTs, ${data.resultado.actividadesCreadas} actividades, ${data.resultado.tareasCreadas} tareas.${responsablesTexto}`,
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'No se pudo aplicar al cronograma', description: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setAplicandoCronograma(false)
    }
  }

  // PLC/HMI (un solo paso) y CON/PRO (esquemas en 2 etapas) comparten el
  // mismo lock de IA por cronograma (ver mutex.ts) — SIEMPRE secuencial,
  // nunca Promise.all entre llamadas que tocan la misma generación, o la
  // segunda falla con 409 "operación en curso".
  async function generarConIA() {
    if (!generacionId) return
    setGenerandoIA(true)
    try {
      const pendientesUnPaso = edtsPendientesIA.filter(e => (EDTS_AGRUPACION_UN_PASO as readonly string[]).includes(e.nombre))
      const pendientesEsquema = edtsPendientesIA.filter(e => (EDTS_ESQUEMA_DOS_ETAPAS as readonly string[]).includes(e.nombre))

      let actividadesActuales = actividades
      let advertenciasAcumuladas = [...advertencias]

      if (pendientesUnPaso.length > 0) {
        const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/proponer-actividades-ia`, {
          method: 'POST',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error generando la propuesta de IA (PLC/HMI)')
        }
        const data = await res.json()
        actividadesActuales = data.propuestaActividades
        advertenciasAcumuladas = data.advertencias ?? advertenciasAcumuladas
      }

      let huboEsquemas = false
      if (pendientesEsquema.length > 0) {
        const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/proponer-esquemas-ia`, {
          method: 'POST',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error proponiendo esquemas de agrupación')
        }
        const data = await res.json()
        const esquemas: Record<string, EsquemaAgrupacionPropuesto[]> = data.esquemasPorEdt ?? {}
        setEsquemasPorEdt(esquemas)
        setIndiceElegido(Object.fromEntries(Object.keys(esquemas).map(k => [k, null])))
        setNombresEditables(Object.fromEntries(Object.keys(esquemas).map(k => [k, []])))
        advertenciasAcumuladas = [...advertenciasAcumuladas, ...(data.advertencias ?? [])]
        huboEsquemas = Object.values(esquemas).some(lista => lista.length > 0)
        if (huboEsquemas) setMostrandoEsquemas(true)
      }

      setActividades(actividadesActuales)
      setAdvertencias(advertenciasAcumuladas)
      setEdtsPendientesIA(calcularEdtsPendientesIA(edtsPendientesIA, actividadesActuales))
      cargarPreviewResponsables(actividadesActuales)
      if (!huboEsquemas) {
        toast({ title: 'Propuesta de IA generada', description: 'Revisa y edita las zonas/familias antes de aplicar.' })
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setGenerandoIA(false)
    }
  }

  // Renombrar re-deriva el alias sugerido, salvo que el usuario ya lo haya
  // editado a mano (aliasManual) — no le pisamos una elección explícita.
  function actualizarNombreEsquema(edtNombre: string, indice: number, nombre: string) {
    setNombresEditables(prev => ({
      ...prev,
      [edtNombre]: (prev[edtNombre] ?? []).map((item, i) =>
        i === indice ? { ...item, nombre, alias: item.aliasManual ? item.alias : derivarAliasCandidato(nombre) } : item
      ),
    }))
  }
  function actualizarAliasEsquema(edtNombre: string, indice: number, alias: string) {
    setNombresEditables(prev => ({
      ...prev,
      [edtNombre]: (prev[edtNombre] ?? []).map((item, i) => (i === indice ? { ...item, alias, aliasManual: true } : item)),
    }))
  }
  function agregarNombreEsquema(edtNombre: string) {
    setNombresEditables(prev => ({ ...prev, [edtNombre]: [...(prev[edtNombre] ?? []), { nombre: '', alias: '' }] }))
  }
  function quitarNombreEsquema(edtNombre: string, indice: number) {
    setNombresEditables(prev => ({ ...prev, [edtNombre]: (prev[edtNombre] ?? []).filter((_, i) => i !== indice) }))
  }

  async function confirmarEsquemas() {
    if (!generacionId) return
    const edtsAConfirmar = Object.keys(esquemasPorEdt).filter(
      edtNombre => esquemasPorEdt[edtNombre].length === 0 || indiceElegido[edtNombre] != null
    )
    setConfirmandoEsquemas(true)
    try {
      let actividadesActuales = actividades
      let advertenciasActuales = advertencias

      // Secuencial (no Promise.all): comparten el mismo lock de IA del
      // cronograma — dos llamadas concurrentes harían fallar la segunda.
      for (const edtNombre of edtsAConfirmar) {
        const nombres = (nombresEditables[edtNombre] ?? [])
          .map(item => ({ nombre: item.nombre.trim(), alias: item.alias.trim() }))
          .filter(item => item.nombre.length > 0)
        if (nombres.length === 0) continue // esquema vacío/sin elegir — el usuario agrupará a mano en el acordeón
        const idx = indiceElegido[edtNombre]
        const res = await fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/${generacionId}/agrupar-esquema-ia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edtNombre,
            nombresActividades: nombres,
            indiceOriginal: idx ?? null,
            criterioOriginal: idx != null ? esquemasPorEdt[edtNombre][idx]?.criterio ?? null : null,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Error asignando tareas de ${edtNombre}`)
        }
        const data = await res.json()
        actividadesActuales = data.propuestaActividades
        advertenciasActuales = data.advertencias ?? advertenciasActuales
      }

      setActividades(actividadesActuales)
      setAdvertencias(advertenciasActuales)
      setEdtsPendientesIA(calcularEdtsPendientesIA(edtsPendientesIA, actividadesActuales))
      cargarPreviewResponsables(actividadesActuales)
      setMostrandoEsquemas(false)
      setEsquemasPorEdt({})
      toast({ title: 'Actividades generadas', description: 'Revisa y edita las tareas asignadas antes de aplicar.' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Error inesperado', variant: 'destructive' })
    } finally {
      setConfirmandoEsquemas(false)
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

  /** Edita nombre/HH estimadas de una tarea propuesta por IA (esPropuestaIA) antes de aceptarla — nunca aplica a tareas de catálogo. */
  function actualizarTareaPropuestaIA(actividadIndex: number, tareaIndex: number, cambios: { nombre?: string; horasEstimadas?: number }) {
    setActividades(prev =>
      prev.map((a, i) =>
        i === actividadIndex
          ? { ...a, tareas: a.tareas.map((t, ti) => (ti === tareaIndex ? { ...t, ...cambios } : t)) }
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

          {tieneTdr && (
            <Alert>
              <FileCheck2 className="h-4 w-4" />
              <AlertDescription>
                TDR disponible — se usará como contexto para zonas y familias al generar con IA (nunca para sugerir EDTs ni tareas).
                {!cotizacionResumen && (
                  <span className="block mt-1 text-amber-600">
                    Sin cotización estructurada, el alcance se define manualmente — el TDR solo aporta contexto, revisa que no incluyas trabajo no vendido.
                  </span>
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

          {organigramaResumen && (
            organigramaResumen.tieneOrganigrama ? (
              <Badge variant="secondary" className="text-xs font-normal">
                Responsables se autoasignarán desde el organigrama ({organigramaResumen.rolesDetectados} rol(es) detectado(s))
              </Badge>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sin organigrama, las tareas se generarán sin responsable —{' '}
                  <a href={`/proyectos/${proyectoId}/organigrama`} target="_blank" rel="noreferrer" className="underline">
                    créalo primero para autoasignar
                  </a>.
                </AlertDescription>
              </Alert>
            )
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

          {(edtEstaSeleccionada('PLA') || edtEstaSeleccionada('TAB')) && (
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
              </div>
            </div>
          )}

          {edtEstaSeleccionada('PLC') && (
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
              </div>
            </div>
          )}

          {edtEstaSeleccionada('HMI') && (
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">N° valorizaciones intermedias</Label>
              <Input type="number" min={0} value={nValorizaciones} onChange={e => { setValorizacionesTocadas(true); setNValorizaciones(Math.max(0, Number(e.target.value))) }} className="h-8 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {cotizacionResumen?.formaPago?.numeroValorizaciones != null
                  ? `Detectado en tu cotización: ${cotizacionResumen.formaPago.numeroValorizaciones} valorización(es) — ajusta si es necesario.`
                  : 'Sugerido: 1 mensual — ajusta si el contrato define hitos.'}
              </p>
            </div>
            <div>
              <Label className="text-sm">Duración estimada (semanas)</Label>
              <Input type="number" min={0} value={duracionSemanas} onChange={e => setDuracionSemanas(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
            </div>
            {edtEstaSeleccionada('SEG') && brownfield && (
              <div>
                <Label className="text-sm">N° de personas a habilitar</Label>
                <Input type="number" min={0} value={nPersonas} onChange={e => setNPersonas(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
              </div>
            )}
            {edtEstaSeleccionada('SEG') && (
              <div>
                <Label className="text-sm">N° de PETS</Label>
                <Input type="number" min={0} value={nPets} onChange={e => setNPets(Math.max(0, Number(e.target.value)))} className="h-8 mt-1" />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm">Descripción libre del alcance</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Usada por la IA para proponer zonas de construcción y familias de procura, y por las reglas de preselección (ej: menciones de neumática, arranque de equipos, instrumentos activan tareas de CMM).</p>
            <Textarea value={alcanceLibre} onChange={e => setAlcanceLibre(e.target.value)} rows={4} placeholder="Ej: instalación eléctrica en sala de tanques y zona de bombas..." />
          </div>
        </div>
      )
    }

    if (mostrandoEsquemas) {
      const puedeConfirmar = Object.keys(esquemasPorEdt).every(
        edtNombre => esquemasPorEdt[edtNombre].length === 0 || indiceElegido[edtNombre] != null
      )
      return (
        <div className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Elegí cómo agrupar cada EDT — podés renombrar, agregar o quitar Actividades del esquema elegido antes de
              que la IA asigne las tareas.
            </AlertDescription>
          </Alert>

          {Object.entries(esquemasPorEdt).map(([edtNombre, esquemas]) => (
            <div key={edtNombre} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{edtNombre}</Badge>
                <span className="text-sm font-medium">Esquema de agrupación</span>
              </div>

              {esquemas.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  La IA no propuso esquemas para este EDT — podrás agrupar las tareas a mano en el paso siguiente.
                </p>
              ) : (
                <RadioGroup
                  value={indiceElegido[edtNombre] != null ? String(indiceElegido[edtNombre]) : undefined}
                  onValueChange={v => {
                    const idx = Number(v)
                    setIndiceElegido(prev => ({ ...prev, [edtNombre]: idx }))
                    setNombresEditables(prev => ({ ...prev, [edtNombre]: esquemas[idx].nombres.map(n => ({ ...n })) }))
                  }}
                >
                  {esquemas.map((esquema, idx) => (
                    <RadioGroupItem key={idx} value={String(idx)} className="items-start border rounded-lg p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{esquema.criterio}</p>
                        <p className="text-xs text-muted-foreground">{esquema.nombres.map(n => n.nombre).join(' / ')}</p>
                        {esquema.nota && <p className="text-xs text-amber-600 mt-0.5">{esquema.nota}</p>}
                      </div>
                    </RadioGroupItem>
                  ))}
                </RadioGroup>
              )}

              {indiceElegido[edtNombre] != null && (
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Actividades de este esquema (editable) — el alias prefija las tareas repetidas</Label>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => agregarNombreEsquema(edtNombre)}>
                      <Plus className="h-3 w-3 mr-1" />Agregar
                    </Button>
                  </div>
                  {(nombresEditables[edtNombre] ?? []).map((item, ni) => (
                    <div key={ni} className="flex gap-2 items-center">
                      {item.fueraDeVocabulario && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-600">
                              Nueva — fuera del vocabulario
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{item.justificacion || 'Propuesta por IA sin justificación explícita.'}</TooltipContent>
                        </Tooltip>
                      )}
                      <Input
                        value={item.nombre}
                        onChange={e => actualizarNombreEsquema(edtNombre, ni, e.target.value)}
                        className="h-8 text-sm flex-1"
                        placeholder="Nombre de la Actividad"
                      />
                      <Input
                        value={item.alias}
                        onChange={e => actualizarAliasEsquema(edtNombre, ni, e.target.value)}
                        className="h-8 text-sm w-20 shrink-0"
                        placeholder="Alias"
                        maxLength={12}
                      />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => quitarNombreEsquema(edtNombre, ni)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setMostrandoEsquemas(false)} disabled={confirmandoEsquemas}>
              Omitir por ahora
            </Button>
            <Button size="sm" onClick={confirmarEsquemas} disabled={confirmandoEsquemas || !puedeConfirmar}>
              {confirmandoEsquemas ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
              ) : (
                'Confirmar y generar Actividades'
              )}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {edtsPendientesIA.length > 0 && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="min-w-0">
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
          <Alert>
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

        {previewResponsables.length > 0 && (
          <div className="border rounded-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
              <span className="text-sm font-medium">Responsables (autoasignados desde el organigrama)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => cargarPreviewResponsables(actividades)}
                disabled={cargandoPreviewResponsables}
              >
                {cargandoPreviewResponsables ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                Actualizar
              </Button>
            </div>
            <div className="p-2 max-h-[200px] overflow-y-auto space-y-1.5">
              {previewResponsables.map(p => (
                <div key={p.edtCodigo} className="text-sm px-2 py-1.5 rounded border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.edtNombre}</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {p.desglose.map(d => (
                        <Badge key={d.rol} variant={d.responsableUserId ? 'secondary' : 'destructive'} className="text-xs font-normal">
                          {ROL_RESPONSABLE_LABELS[d.rol] ?? d.rol}: {d.responsableNombre ?? 'sin asignar'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {p.advertencia && <p className="text-xs text-muted-foreground mt-1">{p.advertencia}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {edtsSinTareasIncluidas.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {edtsSinTareasIncluidas.join(', ')} no {edtsSinTareasIncluidas.length > 1 ? 'tendrán' : 'tendrá'} ninguna tarea en el
              cronograma — todas sus Actividades están vacías o con todas las tareas destildadas.
            </AlertDescription>
          </Alert>
        )}

        <Accordion type="multiple" className="space-y-2">
          {actividadesOrdenadas.map(({ actividad, index }) => (
            <AccordionItem key={index} value={String(index)} className="border rounded-lg px-3">
              <div className="flex items-center gap-2 py-1 min-w-0">
                <AccordionTrigger className="flex-1 min-w-0 py-2 hover:no-underline">
                  <div className="flex flex-wrap items-center gap-2 text-left min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">{actividad.edtNombre}</Badge>
                    <span className="font-medium text-sm truncate min-w-0 max-w-[240px]">{actividad.actividadNombre}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {actividad.tareas.filter(t => t.incluida).length}/{actividad.tareas.length} tareas
                    </Badge>
                    {!tieneAlMenosUnaTareaIncluida(actividad.tareas) && (
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 text-muted-foreground"
                        title="Ninguna tarea de esta Actividad está incluida — no se va a crear al aplicar el cronograma."
                      >
                        No se agregará al cronograma (0 tareas)
                      </Badge>
                    )}
                    {actividad.actividadNombre === 'Sin agrupar' && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] shrink-0"
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
                    // Las tareas propuestas por IA (esPropuestaIA) se muestran en su
                    // propia sección más abajo — acá solo las de catálogo. El índice
                    // real (ti) se preserva para que toggleTarea/moverTarea sigan
                    // apuntando a la posición correcta en actividad.tareas.
                    const tareasCatalogo = actividad.tareas.map((tarea, ti) => ({ tarea, ti })).filter(({ tarea }) => !tarea.esPropuestaIA)
                    return tareasCatalogo.map(({ tarea, ti }) => (
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

                {actividad.tareas.some(t => t.esPropuestaIA) && (
                  <div className="mt-2 pt-2 border-t space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Tareas adicionales propuestas por la IA — no están en el catálogo
                    </p>
                    {actividad.tareas.map((tarea, ti) => ({ tarea, ti })).filter(({ tarea }) => tarea.esPropuestaIA).map(({ tarea, ti }) => (
                      <div key={`ia-${ti}`} className="flex items-start gap-2 text-xs p-1.5 rounded border border-dashed">
                        <Checkbox
                          checked={tarea.incluida}
                          onCheckedChange={checked => toggleTarea(index, ti, checked === true)}
                          className="mt-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] shrink-0 text-blue-600 border-blue-600">
                              IA — nueva
                            </Badge>
                            <Input
                              value={tarea.nombre}
                              onChange={e => actualizarTareaPropuestaIA(index, ti, { nombre: e.target.value })}
                              className="h-7 text-xs flex-1 min-w-[140px]"
                            />
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={tarea.horasEstimadas}
                              onChange={e => actualizarTareaPropuestaIA(index, ti, { horasEstimadas: Number(e.target.value) || 0 })}
                              className="h-7 text-xs w-20 shrink-0"
                              title="Horas estimadas"
                            />
                          </div>
                          {tarea.justificacion && <p className="text-[10px] text-muted-foreground">{tarea.justificacion}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
          className="w-[95vw] max-w-2xl sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
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
    </>
  )
}
