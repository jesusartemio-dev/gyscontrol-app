'use client'

import { useEffect, useState } from 'react'
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
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Sparkles, AlertCircle, FileCheck2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

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
  const [fuenteEdtsSugeridos, setFuenteEdtsSugeridos] = useState<'comercial' | 'ia' | 'manual'>('manual')

  useEffect(() => {
    if (!open) return

    setPasoActual(1)
    setGeneracionId(null)
    setActividades([])
    setAdvertencias([])
    setAdvertenciasPrellenado([])
    setEdtsPendientesIA([])
    setCargandoContexto(true)

    fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard-contexto`)
      .then(async res => {
        if (!res.ok) throw new Error('No se pudo cargar el contexto del wizard')
        return res.json()
      })
      .then((data: { edts: EdtWizardInfo[]; cotizacionResumen: CotizacionResumen | null; tieneCotizacionDocumento: boolean; edtsSugeridosComercial: string[] | null }) => {
        setEdts(data.edts)
        setCotizacionResumen(data.cotizacionResumen)

        // Prioridad de selección de EDTs: 1) cotización COMERCIAL (determinista,
        // servicios realmente vendidos — nunca adivinado); 2) IA desde el PDF
        // (más abajo, solo si no hay #1); 3) fallback "todos los EDTs con
        // servicios" (nunca confiable por sí solo, se sobreescribe apenas
        // haya una fuente mejor).
        const edtsComercial = data.edtsSugeridosComercial
        if (edtsComercial && edtsComercial.length > 0) {
          setEdtsSeleccionados(new Set(edtsComercial))
          setFuenteEdtsSugeridos('comercial')
        } else {
          setEdtsSeleccionados(new Set(data.edts.filter(e => e.totalServicios > 0).map(e => e.id)))
          setFuenteEdtsSugeridos('manual')
        }

        if (data.cotizacionResumen?.resumenAlcance?.length) {
          setAlcanceLibre(data.cotizacionResumen.resumenAlcance.join('\n'))
        }
        setCargandoContexto(false)

        if (!data.tieneCotizacionDocumento) return

        setCargandoPrellenado(true)
        return fetch(`/api/proyectos/${proyectoId}/cronograma/planificacion/wizard/prellenado-ia`, { method: 'POST' })
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
          .finally(() => setCargandoPrellenado(false))
      })
      .catch(() => {
        toast({ title: 'Error cargando el contexto del wizard', variant: 'destructive' })
        setCargandoContexto(false)
        setCargandoPrellenado(false)
      })
    // toast (useToast) no está memoizado: cambia de referencia en cada render, así que
    // incluirlo aquí reintroduce el loop infinito (efecto -> setState -> re-render -> nuevo
    // toast -> efecto de nuevo) que rompió producción — no agregarlo a este array.
  }, [open, proyectoId])

  function toggleEdt(id: string) {
    setEdtsSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
  function eliminarTarea(actividadIndex: number, tareaIndex: number) {
    setActividades(prev =>
      prev.map((a, i) => (i === actividadIndex ? { ...a, tareas: a.tareas.filter((_, ti) => ti !== tareaIndex) } : a))
    )
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
            </div>
            <Card>
              <CardContent className="p-2 max-h-[220px] overflow-y-auto space-y-1">
                {edts.map(edt => (
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
                    <Badge variant={edt.totalServicios > 0 ? 'secondary' : 'outline'} className="text-xs">
                      {edt.totalServicios} servicios
                    </Badge>
                  </div>
                ))}
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
                  {actividad.tareas.map((tarea, ti) => (
                    <div key={tarea.catalogoServicioId} className={`flex items-center gap-2 text-xs p-1.5 rounded ${tarea.incluida ? '' : 'opacity-50'}`}>
                      <span className="flex-1 truncate">{tarea.nombre}</span>
                      {!tarea.incluida && <Badge variant="outline" className="text-[10px]">{tarea.motivoExclusion}</Badge>}
                      <span className="text-muted-foreground shrink-0">{tarea.horasEstimadas.toFixed(1)}h</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={() => eliminarTarea(index, ti)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
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
        <Button variant="ghost" size="sm" onClick={retrocederPaso} disabled={!puedeRetroceder()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        {pasoActual === 1 ? (
          <Button size="sm" onClick={avanzarPaso} disabled={!puedeAvanzar()}>
            {generandoPaso1 ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
            ) : (
              <>Proponer actividades<ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        ) : (
          <div className="flex gap-2">
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
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
  )
}
