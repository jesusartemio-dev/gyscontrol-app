'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, Save, AlertTriangle,
  X, Clock, Calculator, Users, FolderOpen, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Cliente {
  id: string
  nombre: string
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  clienteId: string
  totalCliente: number | null
  moneda: string | null
  adelantoPorcentaje?: number
  adelantoMonto?: number
  adelantoAmortizado?: number
}

interface Recurso {
  id: string
  nombre: string
  tipo: string
}

interface PreviewLinea {
  registroHorasId: string
  proyectoId: string
  proyectoCodigo: string
  proyectoNombre: string
  recursoId: string
  recursoNombre: string
  fecha: string
  detalle: string
  modalidad: string
  horasReportadas: number
  horasStd: number
  horasOT125: number
  horasOT135: number
  horasOT200: number
  horasEquivalente: number
  tarifaHora: number
  moneda: string
  costoLinea: number
  sinTarifa: boolean
  orden: number
}

interface PreviewResumen {
  totalRegistros: number
  totalHorasReportadas: number
  totalHorasEquivalentes: number
  subtotal: number
  descuentoPct: number
  descuentoMonto: number
  subtotalConDescuento: number
  descuentosAplicados: Array<{ desdeHoras: number; descuentoPct: number }>
  registrosSinTarifa: number
  registrosYaValorizados: number
  porProyecto: Array<{ proyectoId: string; proyectoCodigo: string; proyectoNombre: string; totalHoras: number; totalCosto: number }>
  porRecurso: Array<{ recursoId: string; recursoNombre: string; tarifaHora: number; totalHoras: number; totalCosto: number }>
}

const STEPS = ['Configuración', 'Selección de registros', 'Revisión y confirmación']

const formatCurrency = (amount: number, moneda = 'USD') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda === 'PEN' ? 'PEN' : 'USD' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

export default function NuevaValorizacionHHPage() {
  const router = useRouter()

  // === Step control ===
  const [step, setStep] = useState(0)

  // === Step 1: Configuration ===
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFin, setPeriodoFin] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [igvPct, setIgvPct] = useState('18')
  const [descuentoComercialPct, setDescuentoComercialPct] = useState('0')
  const [fondoGarantiaPct, setFondoGarantiaPct] = useState('0')

  // === Step 2: Selection ===
  const [selectedProyectos, setSelectedProyectos] = useState<string[]>([])
  const [selectedRecursos, setSelectedRecursos] = useState<string[]>([])
  const [preview, setPreview] = useState<{ lineas: PreviewLinea[]; resumen: PreviewResumen } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // === Step 3: Review ===
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // === Init data ===
  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, pRes, rRes] = await Promise.all([
          fetch('/api/clientes'),
          fetch('/api/proyectos?fields=id,codigo,nombre,clienteId,totalCliente,moneda'),
          fetch('/api/recurso'),
        ])
        if (cRes.ok) {
          const data = await cRes.json()
          setClientes(Array.isArray(data) ? data : data.clientes || [])
        }
        if (pRes.ok) {
          const data = await pRes.json()
          setProyectos(Array.isArray(data) ? data : data.proyectos || [])
        }
        if (rRes.ok) {
          const data = await rRes.json()
          setRecursos(Array.isArray(data) ? data : data.recursos || [])
        }
      } catch {
        toast.error('Error al cargar datos iniciales')
      } finally {
        setLoadingInit(false)
      }
    }
    load()
  }, [])

  // Filter proyectos by selected cliente
  const proyectosCliente = useMemo(() =>
    proyectos.filter(p => p.clienteId === clienteId),
    [proyectos, clienteId]
  )

  // When cliente changes, reset proyecto selection
  const handleClienteChange = (id: string) => {
    setClienteId(id)
    setProyectoId('')
    setSelectedProyectos([])
    setSelectedRecursos([])
    setPreview(null)
    setRemovedIds(new Set())
  }

  // When main proyecto changes, auto-select it
  const handleProyectoChange = (id: string) => {
    setProyectoId(id)
    setSelectedProyectos([id])
    setPreview(null)
    setRemovedIds(new Set())
  }

  // === Step 2: Load preview ===
  const loadPreview = async () => {
    if (!clienteId || !periodoInicio || !periodoFin) {
      toast.error('Configura cliente y periodo primero')
      return
    }
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/valorizaciones-hh/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          periodoInicio,
          periodoFin,
          proyectosIds: selectedProyectos,
          recursosIds: selectedRecursos,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error en preview')
      }
      const data = await res.json()
      setPreview(data)
      setRemovedIds(new Set())
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  // Auto-load preview when entering step 2
  const goToStep2 = () => {
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (!proyectoId) { toast.error('Selecciona un proyecto principal'); return }
    if (!periodoInicio || !periodoFin) { toast.error('Define el periodo'); return }
    if (new Date(periodoFin) <= new Date(periodoInicio)) {
      toast.error('Periodo Fin debe ser posterior a Periodo Inicio')
      return
    }
    setStep(1)
    loadPreview()
  }

  // === Step 3: Filtered lines (after removals) ===
  const activeLines = useMemo(() =>
    (preview?.lineas || []).filter(l => !removedIds.has(l.registroHorasId)),
    [preview, removedIds]
  )

  const toggleRemove = (id: string) => {
    setRemovedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Recalculate totals for active lines
  const activeTotals = useMemo(() => {
    const totalHorasReportadas = +activeLines.reduce((s, l) => s + l.horasReportadas, 0).toFixed(4)
    const totalHorasEquivalentes = +activeLines.reduce((s, l) => s + l.horasEquivalente, 0).toFixed(4)
    const subtotalHH = +activeLines.reduce((s, l) => s + l.costoLinea, 0).toFixed(2)

    // Approximate discount from preview proportionally
    const originalSubtotal = preview?.resumen.subtotal || 0
    const descPct = preview?.resumen.descuentoPct || 0
    const descuentoMonto = +(subtotalHH * descPct).toFixed(2)
    const montoValorizacion = +(subtotalHH - descuentoMonto).toFixed(2)

    // Financial
    const dComPct = parseFloat(descuentoComercialPct) || 0
    const descuentoComercialMonto = +(montoValorizacion * dComPct / 100).toFixed(2)
    const igv = parseFloat(igvPct) || 18
    const fg = parseFloat(fondoGarantiaPct) || 0

    // Adelanto — simplified (server recalculates)
    const adelantoMonto = 0

    const subtotal = +(montoValorizacion - descuentoComercialMonto - adelantoMonto).toFixed(2)
    const igvMonto = +(subtotal * igv / 100).toFixed(2)
    const fondoGarantiaMonto = +(subtotal * fg / 100).toFixed(2)
    const netoARecibir = +(subtotal + igvMonto - fondoGarantiaMonto).toFixed(2)

    return {
      totalRegistros: activeLines.length,
      totalHorasReportadas,
      totalHorasEquivalentes,
      subtotalHH,
      descPct,
      descuentoMonto,
      montoValorizacion,
      descuentoComercialMonto,
      subtotal,
      igvMonto,
      fondoGarantiaMonto,
      netoARecibir,
      sinTarifa: activeLines.filter(l => l.sinTarifa).length,
    }
  }, [activeLines, preview, descuentoComercialPct, igvPct, fondoGarantiaPct])

  // Group lines by proyecto then recurso for review
  const groupedLines = useMemo(() => {
    const map = new Map<string, { proyecto: { id: string; codigo: string; nombre: string }; lineas: PreviewLinea[] }>()
    for (const l of activeLines) {
      if (!map.has(l.proyectoId)) {
        map.set(l.proyectoId, {
          proyecto: { id: l.proyectoId, codigo: l.proyectoCodigo, nombre: l.proyectoNombre },
          lineas: [],
        })
      }
      map.get(l.proyectoId)!.lineas.push(l)
    }
    return Array.from(map.values())
  }, [activeLines])

  // === Save ===
  const handleSave = async () => {
    if (activeLines.length === 0) {
      toast.error('No hay registros para valorizar')
      return
    }
    if (activeTotals.sinTarifa > 0) {
      toast.error(`Hay ${activeTotals.sinTarifa} registro(s) sin tarifa configurada. Elimínalos o configura las tarifas.`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        proyectoId,
        clienteId,
        periodoInicio,
        periodoFin,
        proyectosIds: selectedProyectos,
        registroHorasIds: activeLines.map(l => l.registroHorasId),
        moneda,
        descuentoComercialPorcentaje: parseFloat(descuentoComercialPct) || 0,
        igvPorcentaje: parseFloat(igvPct) || 18,
        fondoGarantiaPorcentaje: parseFloat(fondoGarantiaPct) || 0,
      }

      const res = await fetch('/api/valorizaciones-hh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }
      const creada = await res.json()
      toast.success('Valorización HH creada exitosamente')
      router.push(`/gestion/valorizaciones/${creada.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // === Render ===
  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/gestion/valorizaciones')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Nueva Valorización por Horas Hombre</h1>
          <p className="text-sm text-muted-foreground">Asistente de 3 pasos para crear una valorización HH</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 px-2">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                i < step ? 'bg-green-100 text-green-700' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${
                i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Configuration */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="font-semibold text-lg">Paso 1: Configuración</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proyecto principal *</Label>
                <Select value={proyectoId} onValueChange={handleProyectoChange} disabled={!clienteId}>
                  <SelectTrigger><SelectValue placeholder={clienteId ? 'Selecciona un proyecto' : 'Primero selecciona un cliente'} /></SelectTrigger>
                  <SelectContent>
                    {proyectosCliente.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Periodo Inicio *</Label>
                <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
              </div>
              <div>
                <Label>Periodo Fin *</Label>
                <Input type="date" value={periodoFin} onChange={e => setPeriodoFin(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Moneda</Label>
                <Select value={moneda} onValueChange={setMoneda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="PEN">PEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IGV %</Label>
                <Input type="number" step="0.01" value={igvPct} onChange={e => setIgvPct(e.target.value)} />
              </div>
              <div>
                <Label>Dcto. Comercial %</Label>
                <Input type="number" step="0.01" value={descuentoComercialPct} onChange={e => setDescuentoComercialPct(e.target.value)} />
              </div>
              <div>
                <Label>Fondo Garantía %</Label>
                <Input type="number" step="0.01" value={fondoGarantiaPct} onChange={e => setFondoGarantiaPct(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={goToStep2}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Paso 2: Selección de registros</h2>
                <Button variant="outline" size="sm" onClick={loadPreview} disabled={loadingPreview}>
                  {loadingPreview ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
                  Recalcular
                </Button>
              </div>

              {/* Multi-proyecto selection */}
              {proyectosCliente.length > 1 && (
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    <FolderOpen className="h-4 w-4" /> Proyectos a incluir
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {proyectosCliente.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedProyectos.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setSelectedProyectos(prev =>
                              checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                            )
                          }}
                        />
                        {p.codigo} - {p.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurso filter (optional) */}
              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Users className="h-4 w-4" /> Filtrar por recursos (opcional — vacío = todos)
                </Label>
                <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto">
                  {recursos.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedRecursos.includes(r.id)}
                        onCheckedChange={(checked) => {
                          setSelectedRecursos(prev =>
                            checked ? [...prev, r.id] : prev.filter(id => id !== r.id)
                          )
                        }}
                      />
                      {r.nombre}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview results */}
          {loadingPreview && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Calculando preview...</span>
            </div>
          )}

          {preview && !loadingPreview && (
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Summary badges */}
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {preview.resumen.totalRegistros} registros
                  </Badge>
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    {preview.resumen.totalHorasReportadas.toFixed(1)} hrs reportadas
                  </Badge>
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    {preview.resumen.totalHorasEquivalentes.toFixed(1)} hrs equivalentes
                  </Badge>
                  <Badge variant="outline" className="text-sm py-1 px-3 font-semibold">
                    {formatCurrency(preview.resumen.subtotalConDescuento)}
                  </Badge>
                  {preview.resumen.registrosSinTarifa > 0 && (
                    <Badge variant="destructive" className="text-sm py-1 px-3">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      {preview.resumen.registrosSinTarifa} sin tarifa
                    </Badge>
                  )}
                  {preview.resumen.registrosYaValorizados > 0 && (
                    <Badge variant="secondary" className="text-sm py-1 px-3">
                      {preview.resumen.registrosYaValorizados} ya valorizados (excluidos)
                    </Badge>
                  )}
                </div>

                {/* Desglose por proyecto */}
                {preview.resumen.porProyecto.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Por proyecto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {preview.resumen.porProyecto.map(pp => (
                        <div key={pp.proyectoId} className="bg-muted/50 rounded px-3 py-2 text-sm">
                          <span className="font-medium">{pp.proyectoCodigo}</span>
                          <span className="text-muted-foreground ml-1">— {pp.totalHoras.toFixed(1)} hrs</span>
                          <span className="float-right font-mono">{formatCurrency(pp.totalCosto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Desglose por recurso */}
                {preview.resumen.porRecurso.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Por recurso</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {preview.resumen.porRecurso.map(pr => (
                        <div key={pr.recursoId} className="bg-muted/50 rounded px-3 py-2 text-sm">
                          <span className="font-medium">{pr.recursoNombre}</span>
                          <span className="text-muted-foreground ml-1">@ {formatCurrency(pr.tarifaHora)}/hr</span>
                          <span className="float-right font-mono">{formatCurrency(pr.totalCosto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount info */}
                {preview.resumen.descuentoPct > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
                    Descuento por volumen: {(preview.resumen.descuentoPct * 100).toFixed(1)}% = {formatCurrency(preview.resumen.descuentoMonto)}
                    {preview.resumen.descuentosAplicados.length > 0 && (
                      <span className="text-xs ml-2">
                        ({preview.resumen.descuentosAplicados.map(d =>
                          `${(d.descuentoPct * 100).toFixed(0)}% desde ${d.desdeHoras} hrs`
                        ).join(' + ')})
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!preview || preview.resumen.totalRegistros === 0}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Sin tarifa alert */}
          {activeTotals.sinTarifa > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-800">
                <strong>{activeTotals.sinTarifa} registro(s) sin tarifa configurada.</strong> Estos registros generarán costo $0.
                Elimínalos de la selección o configura las tarifas en la pestaña Tarifas HH del cliente.
              </div>
            </div>
          )}

          {/* Lines table grouped by proyecto */}
          {groupedLines.map(group => (
            <Card key={group.proyecto.id}>
              <CardContent className="p-0">
                <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{group.proyecto.codigo}</span>
                  <span className="text-muted-foreground text-sm">— {group.proyecto.nombre}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{group.lineas.length} líneas</Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Modalidad</TableHead>
                        <TableHead className="text-right">Hrs Rep.</TableHead>
                        <TableHead className="text-right">Hrs Equiv.</TableHead>
                        <TableHead className="text-right">Tarifa/hr</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.lineas.map(l => (
                        <TableRow key={l.registroHorasId} className={l.sinTarifa ? 'bg-red-50' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRemove(l.registroHorasId)}
                              title="Quitar de la valorización"
                            >
                              <X className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {l.recursoNombre}
                            {l.sinTarifa && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline ml-1" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(l.fecha)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{l.modalidad}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{l.horasReportadas.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{l.horasEquivalente.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(l.tarifaHora)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(l.costoLinea)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Removed items count */}
          {removedIds.size > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              {removedIds.size} registro(s) excluidos de la valorización.{' '}
              <button className="text-blue-600 hover:underline" onClick={() => setRemovedIds(new Set())}>
                Restaurar todos
              </button>
            </div>
          )}

          {/* Totals panel */}
          <Card className="border-2">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Resumen financiero</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-muted/50 rounded p-3 text-center">
                  <div className="text-xs text-muted-foreground">Registros</div>
                  <div className="text-lg font-bold">{activeTotals.totalRegistros}</div>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <div className="text-xs text-muted-foreground">Horas reportadas</div>
                  <div className="text-lg font-bold">{activeTotals.totalHorasReportadas.toFixed(1)}</div>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <div className="text-xs text-muted-foreground">Horas equivalentes</div>
                  <div className="text-lg font-bold">{activeTotals.totalHorasEquivalentes.toFixed(1)}</div>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <div className="text-xs text-muted-foreground">Subtotal HH</div>
                  <div className="text-lg font-bold">{formatCurrency(activeTotals.subtotalHH)}</div>
                </div>
              </div>

              <div className="space-y-1 text-sm max-w-md ml-auto">
                <div className="flex justify-between">
                  <span>Subtotal HH</span>
                  <span className="font-mono">{formatCurrency(activeTotals.subtotalHH)}</span>
                </div>
                {activeTotals.descPct > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>(-) Dcto. volumen ({(activeTotals.descPct * 100).toFixed(1)}%)</span>
                    <span className="font-mono">-{formatCurrency(activeTotals.descuentoMonto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Monto valorización</span>
                  <span className="font-mono">{formatCurrency(activeTotals.montoValorizacion)}</span>
                </div>
                {activeTotals.descuentoComercialMonto > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) Dcto. comercial ({descuentoComercialPct}%)</span>
                    <span className="font-mono">-{formatCurrency(activeTotals.descuentoComercialMonto)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(activeTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(+) IGV ({igvPct}%)</span>
                  <span className="font-mono">+{formatCurrency(activeTotals.igvMonto)}</span>
                </div>
                {activeTotals.fondoGarantiaMonto > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>(-) Fondo garantía ({fondoGarantiaPct}%)</span>
                    <span className="font-mono">-{formatCurrency(activeTotals.fondoGarantiaMonto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                  <span>Neto a recibir</span>
                  <span className="font-mono text-green-700">{formatCurrency(activeTotals.netoARecibir)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
            <Button onClick={handleSave} disabled={saving || activeLines.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar borrador
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
