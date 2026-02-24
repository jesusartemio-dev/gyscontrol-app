'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileSpreadsheet, Loader2, Search, Eye, Send, CheckCircle, Edit, Ban, Check, Upload, Download, AlertTriangle, RefreshCw } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import ValorizacionImportExcelModal from '@/components/gestion/ValorizacionImportExcelModal'
import { exportarValAExcel } from '@/lib/utils/valorizacionExcel'
import TablaPartidas from '@/components/valorizacion/TablaPartidas'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  totalCliente: number | null
  moneda: string | null
  tipoCambio: number | null
  cotizacionId?: string | null
  adelantoPorcentaje?: number
  adelantoMonto?: number
  adelantoAmortizado?: number
}

interface Valorizacion {
  id: string
  proyectoId: string
  numero: number
  codigo: string
  periodoInicio: string
  periodoFin: string
  moneda: string
  tipoCambio: number | null
  presupuestoContractual: number
  acumuladoAnterior: number
  montoValorizacion: number
  acumuladoActual: number
  saldoPorValorizar: number
  porcentajeAvance: number
  descuentoComercialPorcentaje: number
  descuentoComercialMonto: number
  adelantoPorcentaje: number
  adelantoMonto: number
  subtotal: number
  igvPorcentaje: number
  igvMonto: number
  fondoGarantiaPorcentaje: number
  fondoGarantiaMonto: number
  netoARecibir: number
  estado: string
  fechaEnvio: string | null
  fechaAprobacion: string | null
  fechaObservacion: string | null
  fechaCorreccion: string | null
  motivoObservacion: string | null
  ciclosAprobacion: number
  observaciones: string | null
  createdAt: string
  updatedAt: string
  proyecto?: Proyecto
}

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  { value: 'observada', label: 'Observada', color: 'bg-orange-100 text-orange-700' },
  { value: 'corregida', label: 'Corregida', color: 'bg-violet-100 text-violet-700' },
  { value: 'aprobada_cliente', label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'facturada', label: 'Facturada', color: 'bg-purple-100 text-purple-700' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-800' },
  { value: 'anulada', label: 'Anulada', color: 'bg-red-100 text-red-700' },
]

const getEstadoColor = (estado: string) =>
  ESTADOS.find(e => e.value === estado)?.color || 'bg-gray-100 text-gray-700'

const getEstadoLabel = (estado: string) =>
  ESTADOS.find(e => e.value === estado)?.label || estado

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const formatPeriod = (start: string, end: string) =>
  `${formatDate(start)} — ${formatDate(end)}`

export default function ValorizacionesPage() {
  const [items, setItems] = useState<Valorizacion[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Valorizacion | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProyecto, setFilterProyecto] = useState<string>('all')
  const [filterEstado, setFilterEstado] = useState<string>('all')

  // Form fields (create + edit)
  const [editingVal, setEditingVal] = useState<Valorizacion | null>(null)
  const [formProyectoId, setFormProyectoId] = useState('')
  const [formMontoValorizacion, setFormMontoValorizacion] = useState('')
  const [formPeriodoInicio, setFormPeriodoInicio] = useState('')
  const [formPeriodoFin, setFormPeriodoFin] = useState('')
  const [formDescuento, setFormDescuento] = useState('0')
  const [formAdelanto, setFormAdelanto] = useState('0')
  const [formIgv, setFormIgv] = useState('18')
  const [formFondoGarantia, setFormFondoGarantia] = useState('0')
  const [formMoneda, setFormMoneda] = useState('USD')
  const [formTipoCambio, setFormTipoCambio] = useState('')
  const [showTipoCambio, setShowTipoCambio] = useState(false)
  const [formObservaciones, setFormObservaciones] = useState('')

  const [showImportDialog, setShowImportDialog] = useState(false)

  // Estado transition dialog
  const [showEstadoDialog, setShowEstadoDialog] = useState(false)
  const [estadoTarget, setEstadoTarget] = useState<{ val: Valorizacion; estado: string } | null>(null)

  // Observar dialog
  const [showObservarDialog, setShowObservarDialog] = useState(false)
  const [observarTarget, setObservarTarget] = useState<Valorizacion | null>(null)
  const [motivoObservacion, setMotivoObservacion] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vRes, pRes] = await Promise.all([
        fetch('/api/gestion/valorizaciones'),
        fetch('/api/proyectos?fields=id,codigo,nombre'),
      ])
      let valorizaciones: Valorizacion[] = []
      if (vRes.ok) {
        valorizaciones = await vRes.json()
        setItems(valorizaciones)
      }
      if (pRes.ok) {
        const data = await pRes.json()
        const proyList: Proyecto[] = Array.isArray(data) ? data : data.proyectos || []
        // Enriquecer proyectos con datos de adelanto desde las valorizaciones
        const adelantoMap = new Map<string, { adelantoPorcentaje: number; adelantoMonto: number; adelantoAmortizado: number }>()
        for (const v of valorizaciones) {
          if (v.proyecto && !adelantoMap.has(v.proyecto.id)) {
            const p = v.proyecto as any
            if (p.adelantoPorcentaje !== undefined) {
              adelantoMap.set(p.id, {
                adelantoPorcentaje: p.adelantoPorcentaje ?? 0,
                adelantoMonto: p.adelantoMonto ?? 0,
                adelantoAmortizado: p.adelantoAmortizado ?? 0,
              })
            }
          }
        }
        setProyectos(proyList.map(p => ({
          ...p,
          ...adelantoMap.get(p.id),
        })))
      }
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (filterProyecto !== 'all') result = result.filter(i => i.proyectoId === filterProyecto)
    if (filterEstado !== 'all') result = result.filter(i => i.estado === filterEstado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.codigo.toLowerCase().includes(term) ||
        i.proyecto?.nombre.toLowerCase().includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterProyecto, filterEstado, searchTerm])

  const resetForm = () => {
    setEditingVal(null)
    setFormProyectoId('')
    setFormMontoValorizacion('')
    setFormPeriodoInicio('')
    setFormPeriodoFin('')
    setFormDescuento('0')
    setFormAdelanto('0')
    setFormIgv('18')
    setFormFondoGarantia('0')
    setFormMoneda('USD')
    setFormTipoCambio('')
    setShowTipoCambio(false)
    setFormObservaciones('')
  }

  const openCreate = () => { resetForm(); setShowForm(true) }

  const openEdit = (val: Valorizacion) => {
    setEditingVal(val)
    setFormProyectoId(val.proyectoId)
    setFormMontoValorizacion(val.montoValorizacion.toString())
    setFormPeriodoInicio(val.periodoInicio.split('T')[0])
    setFormPeriodoFin(val.periodoFin.split('T')[0])
    setFormDescuento(val.descuentoComercialPorcentaje.toString())
    setFormIgv(val.igvPorcentaje.toString())
    setFormFondoGarantia(val.fondoGarantiaPorcentaje.toString())
    setFormMoneda(val.moneda)
    setFormTipoCambio(val.tipoCambio?.toString() || '')
    setShowTipoCambio(!!val.tipoCambio)
    setFormObservaciones(val.observaciones || '')
    // Setear adelanto: usar valor existente de la valorización
    setFormAdelanto(val.adelantoPorcentaje.toString())
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formPeriodoInicio || !formPeriodoFin) {
      toast.error('Periodo inicio y fin son requeridos')
      return
    }
    if (new Date(formPeriodoFin) <= new Date(formPeriodoInicio)) {
      toast.error('Periodo Fin debe ser posterior a Periodo Inicio')
      return
    }
    if (!editingVal && !formProyectoId) {
      toast.error('Selecciona un proyecto')
      return
    }
    setSaving(true)
    try {
      const monto = parseFloat(formMontoValorizacion) || 0
      const payload = {
        montoValorizacion: monto,
        periodoInicio: formPeriodoInicio,
        periodoFin: formPeriodoFin,
        descuentoComercialPorcentaje: parseFloat(formDescuento) || 0,
        adelantoPorcentaje: parseFloat(formAdelanto) || 0,
        igvPorcentaje: parseFloat(formIgv) || 18,
        fondoGarantiaPorcentaje: parseFloat(formFondoGarantia) || 0,
        moneda: formMoneda,
        tipoCambio: formTipoCambio ? parseFloat(formTipoCambio) : null,
        observaciones: formObservaciones || null,
      }

      if (editingVal) {
        // Modo edición: actualizar campos (porcentajes, periodo, etc.)
        const res = await fetch(`/api/proyectos/${editingVal.proyectoId}/valorizaciones/${editingVal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Error')
        }
        toast.success('Valorización actualizada')
        setShowForm(false)
        resetForm()
        loadData()
      } else {
        // Modo creación: crear registro base con monto=0, luego pasar a edición
        const res = await fetch(`/api/proyectos/${formProyectoId}/valorizaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, montoValorizacion: 0 }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Error')
        }
        const creada: Valorizacion = await res.json()
        toast.success('Valorización creada — ahora agrega las partidas')
        // Transicionar a modo edición con la valorización recién creada
        setEditingVal(creada)
        setFormProyectoId(creada.proyectoId)
        setFormMontoValorizacion('0')
        loadData()
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Callback cuando TablaPartidas actualiza el monto
  const handleMontoFromPartidas = useCallback((monto: number) => {
    setFormMontoValorizacion(monto.toString())
  }, [])

  const openEstadoTransition = (val: Valorizacion, nuevoEstado: string) => {
    setEstadoTarget({ val, estado: nuevoEstado })
    setShowEstadoDialog(true)
  }

  const handleEstadoChange = async () => {
    if (!estadoTarget) return
    setSaving(true)
    try {
      const body: any = { estado: estadoTarget.estado }
      const res = await fetch(`/api/proyectos/${estadoTarget.val.proyectoId}/valorizaciones/${estadoTarget.val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al cambiar estado')
      }
      toast.success(`Estado cambiado a ${getEstadoLabel(estadoTarget.estado)}`)
      setShowEstadoDialog(false)
      setEstadoTarget(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al cambiar estado')
    } finally {
      setSaving(false)
    }
  }

  const openObservar = (val: Valorizacion) => {
    setObservarTarget(val)
    setMotivoObservacion('')
    setShowObservarDialog(true)
  }

  const handleObservar = async () => {
    if (!observarTarget) return
    if (!motivoObservacion.trim()) {
      toast.error('Ingresa el motivo de la observación')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${observarTarget.proyectoId}/valorizaciones/${observarTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'observada', motivoObservacion: motivoObservacion.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Valorización marcada como observada')
      setShowObservarDialog(false)
      setObservarTarget(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al observar')
    } finally {
      setSaving(false)
    }
  }

  // Preview calculation
  const preview = useMemo(() => {
    const monto = parseFloat(formMontoValorizacion) || 0
    const desc = monto * (parseFloat(formDescuento) || 0) / 100

    // Usar adelanto del proyecto si disponible, sino el porcentaje manual
    const proy = proyectos.find(p => p.id === (editingVal?.proyectoId || formProyectoId))
    let adel = monto * (parseFloat(formAdelanto) || 0) / 100
    if (proy && (proy.adelantoMonto ?? 0) > 0) {
      const saldo = (proy.adelantoMonto ?? 0) - (proy.adelantoAmortizado ?? 0)
      if (saldo > 0) {
        const calc = calcularAdelantoValorizacion(
          { adelantoPorcentaje: proy.adelantoPorcentaje ?? 0, adelantoMonto: proy.adelantoMonto ?? 0, adelantoAmortizado: proy.adelantoAmortizado ?? 0 },
          monto
        )
        adel = calc.adelantoMonto
      } else {
        adel = 0
      }
    }

    const sub = monto - desc - adel
    const igv = sub * (parseFloat(formIgv) || 18) / 100
    const fg = sub * (parseFloat(formFondoGarantia) || 0) / 100
    const neto = sub + igv - fg
    return { descuento: desc, adelanto: adel, subtotal: sub, igv, fondoGarantia: fg, netoARecibir: neto }
  }, [formMontoValorizacion, formDescuento, formAdelanto, formIgv, formFondoGarantia, proyectos, editingVal, formProyectoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">Gestión de valorizaciones de todos los proyectos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarValAExcel(filtered as any)}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Valorización
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar código, proyecto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterProyecto} onValueChange={setFilterProyecto}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {proyectos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Monto Val.</TableHead>
                <TableHead className="text-right">Acumulado</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Neto a Recibir</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay valorizaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id} className={item.estado === 'anulada' ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm font-medium">{item.codigo}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{item.proyecto?.codigo}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[200px]">{item.proyecto?.nombre}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatPeriod(item.periodoInicio, item.periodoFin)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.montoValorizacion, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.acumuladoActual, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(item.porcentajeAvance, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{item.porcentajeAvance.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(item.estado)}>{getEstadoLabel(item.estado)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(item.netoARecibir, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(item)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.estado === 'borrador' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'enviada')} title="Enviar">
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                          </>
                        )}
                        {(item.estado === 'enviada' || item.estado === 'corregida') && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openObservar(item)} title="Marcar Observada">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'aprobada_cliente')} title="Aprobar">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                          </>
                        )}
                        {item.estado === 'observada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'corregida')} title="Enviar Corrección">
                            <RefreshCw className="h-4 w-4 text-violet-600" />
                          </Button>
                        )}
                        {!['anulada', 'pagada', 'facturada', 'aprobada_cliente'].includes(item.estado) && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'anulada')} title="Anular">
                            <Ban className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className={editingVal ? 'max-w-5xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{editingVal ? `Editar ${editingVal.codigo}` : 'Nueva Valorización'}</DialogTitle>
            <DialogDescription>
              {editingVal
                ? `${editingVal.proyecto?.codigo} — ${editingVal.proyecto?.nombre}`
                : 'Selecciona un proyecto y completa los datos. Luego podrás agregar las partidas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {!editingVal && (
              <div>
                <Label>Proyecto *</Label>
                <Select value={formProyectoId} onValueChange={id => {
                  setFormProyectoId(id)
                  const proy = proyectos.find(p => p.id === id)
                  if (proy) {
                    setFormMoneda(proy.moneda || 'USD')
                    if (proy.tipoCambio) {
                      setFormTipoCambio(proy.tipoCambio.toString())
                      setShowTipoCambio(true)
                    } else {
                      setFormTipoCambio('')
                      setShowTipoCambio(false)
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
                  <SelectContent>
                    {proyectos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Configuración financiera - layout compacto en edición */}
            {editingVal ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Periodo</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Input type="date" className="h-8 text-xs" value={formPeriodoInicio} onChange={e => setFormPeriodoInicio(e.target.value)} />
                        <Input type="date" className="h-8 text-xs" value={formPeriodoFin} onChange={e => setFormPeriodoFin(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Moneda</Label>
                      <Select value={formMoneda} onValueChange={setFormMoneda}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="PEN">PEN</SelectItem>
                        </SelectContent>
                      </Select>
                      {showTipoCambio && (
                        <Input type="number" step="0.001" placeholder="TC" className="h-7 text-xs mt-1" value={formTipoCambio} onChange={e => setFormTipoCambio(e.target.value)} />
                      )}
                      {!showTipoCambio && (
                        <button type="button" className="text-[10px] text-blue-600 hover:underline mt-0.5" onClick={() => setShowTipoCambio(true)}>
                          + Tipo de cambio
                        </button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descuento %</Label>
                      <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formDescuento} onChange={e => setFormDescuento(e.target.value)} />
                      {(() => {
                        const proy = proyectos.find(p => p.id === (editingVal?.proyectoId || formProyectoId))
                        const proyAdelanto = proy && (proy.adelantoMonto ?? 0) > 0
                          ? { adelantoPorcentaje: proy.adelantoPorcentaje ?? 0, adelantoMonto: proy.adelantoMonto ?? 0, adelantoAmortizado: proy.adelantoAmortizado ?? 0 }
                          : null
                        if (!proyAdelanto) {
                          return (
                            <div className="mt-2">
                              <Label className="text-xs text-muted-foreground">Adelanto %</Label>
                              <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                            </div>
                          )
                        }
                        const saldoDisponible = proyAdelanto.adelantoMonto - proyAdelanto.adelantoAmortizado
                        if (saldoDisponible <= 0) {
                          return (
                            <div className="mt-2">
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Adelanto amortizado 100%</Badge>
                            </div>
                          )
                        }
                        const monto = parseFloat(formMontoValorizacion) || 0
                        const calc = calcularAdelantoValorizacion(proyAdelanto, monto)
                        return (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Adelanto % <span className="text-[10px]">({proyAdelanto.adelantoPorcentaje}%)</span></Label>
                            <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Saldo: {formatCurrency(saldoDisponible, proy?.moneda || 'PEN')}
                              {calc.adelantoMonto > 0 && ` | -${formatCurrency(calc.adelantoMonto, proy?.moneda || 'PEN')}`}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IGV %</Label>
                      <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formIgv} onChange={e => setFormIgv(e.target.value)} />
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground">Fondo Garantía %</Label>
                        <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formFondoGarantia} onChange={e => setFormFondoGarantia(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Input placeholder="Observaciones..." className="h-8 text-xs" value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Periodo Inicio *</Label>
                    <Input type="date" value={formPeriodoInicio} onChange={e => setFormPeriodoInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label>Periodo Fin *</Label>
                    <Input type="date" value={formPeriodoFin} onChange={e => setFormPeriodoFin(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Moneda</Label>
                    <Select value={formMoneda} onValueChange={setFormMoneda}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                        <SelectItem value="PEN">Soles (PEN)</SelectItem>
                      </SelectContent>
                    </Select>
                    {!showTipoCambio ? (
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline mt-1"
                        onClick={() => setShowTipoCambio(true)}
                      >
                        ¿Registrar tipo de cambio?
                      </button>
                    ) : (
                      <div className="mt-2">
                        <Label>Tipo de Cambio</Label>
                        <Input type="number" step="0.001" placeholder="Ej: 3.75" value={formTipoCambio} onChange={e => setFormTipoCambio(e.target.value)} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Descuento Comercial %</Label>
                      <Input type="number" step="0.01" value={formDescuento} onChange={e => setFormDescuento(e.target.value)} />
                    </div>
                    {(() => {
                      const proy = proyectos.find(p => p.id === (editingVal?.proyectoId || formProyectoId))
                      const proyAdelanto = proy && (proy.adelantoMonto ?? 0) > 0
                        ? { adelantoPorcentaje: proy.adelantoPorcentaje ?? 0, adelantoMonto: proy.adelantoMonto ?? 0, adelantoAmortizado: proy.adelantoAmortizado ?? 0 }
                        : null
                      if (!proyAdelanto) {
                        return (
                          <div>
                            <Label>Adelanto %</Label>
                            <Input type="number" step="0.01" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                          </div>
                        )
                      }
                      const saldoDisponible = proyAdelanto.adelantoMonto - proyAdelanto.adelantoAmortizado
                      if (saldoDisponible <= 0) {
                        return (
                          <div>
                            <Label>Adelanto</Label>
                            <Badge className="bg-emerald-100 text-emerald-700 mt-1">Adelanto amortizado al 100%</Badge>
                          </div>
                        )
                      }
                      const monto = parseFloat(formMontoValorizacion) || 0
                      const calc = calcularAdelantoValorizacion(proyAdelanto, monto)
                      return (
                        <div>
                          <Label>Adelanto % <span className="text-xs text-muted-foreground">(auto: {proyAdelanto.adelantoPorcentaje}%)</span></Label>
                          <Input type="number" step="0.01" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                          <div className="text-xs text-muted-foreground mt-1">
                            Saldo disponible: {formatCurrency(saldoDisponible, proy?.moneda || 'PEN')}
                            {calc.adelantoMonto > 0 && ` | Descuento: ${formatCurrency(calc.adelantoMonto, proy?.moneda || 'PEN')}`}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>IGV %</Label>
                    <Input type="number" step="0.01" value={formIgv} onChange={e => setFormIgv(e.target.value)} />
                  </div>
                  <div>
                    <Label>Fondo de Garantía %</Label>
                    <Input type="number" step="0.01" value={formFondoGarantia} onChange={e => setFormFondoGarantia(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Observaciones</Label>
                  <Input placeholder="Observaciones..." value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)} />
                </div>
              </>
            )}

            {/* Tabla de partidas (solo cuando ya existe la valorización) */}
            {editingVal && (
              <TablaPartidas
                valorizacionId={editingVal.id}
                proyectoId={editingVal.proyectoId}
                readOnly={editingVal.estado !== 'borrador'}
                tieneCotizacion={!!proyectos.find(p => p.id === editingVal.proyectoId)?.cotizacionId}
                onMontoChange={handleMontoFromPartidas}
              />
            )}

            {/* Preview cálculos */}
            {parseFloat(formMontoValorizacion) > 0 && (
              <Card className="bg-muted/30 border">
                <CardContent className="p-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto Val.</span>
                      <span className="font-mono font-medium">{formatCurrency(parseFloat(formMontoValorizacion) || 0, formMoneda)}</span>
                    </div>
                    {preview.descuento > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>(-) Desc.</span>
                        <span className="font-mono">-{formatCurrency(preview.descuento, formMoneda)}</span>
                      </div>
                    )}
                    {preview.adelanto > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>(-) Adelanto</span>
                        <span className="font-mono">-{formatCurrency(preview.adelanto, formMoneda)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono">{formatCurrency(preview.subtotal, formMoneda)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) IGV</span>
                      <span className="font-mono">+{formatCurrency(preview.igv, formMoneda)}</span>
                    </div>
                    {preview.fondoGarantia > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>(-) F. Garantía</span>
                        <span className="font-mono">-{formatCurrency(preview.fondoGarantia, formMoneda)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold col-span-2 md:col-span-1 border-t pt-1 md:border-t-0 md:pt-0">
                      <span>Neto a Recibir</span>
                      <span className="font-mono text-base">{formatCurrency(preview.netoARecibir, formMoneda)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              {editingVal ? 'Cerrar' : 'Cancelar'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingVal ? 'Guardar cambios' : 'Crear y agregar partidas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog detalle */}
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) setShowDetail(null) }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Valorización {showDetail?.codigo}</DialogTitle>
            <DialogDescription>
              {showDetail?.proyecto?.codigo} — {showDetail?.proyecto?.nombre}
            </DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
              {/* Banner de flujo de estados */}
              <ValorizacionFlowBanner estado={showDetail.estado} />

              {/* Alerta de observación del cliente */}
              {(['observada', 'corregida'].includes(showDetail.estado)) && showDetail.motivoObservacion && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-800">Observación del cliente</div>
                    <p className="text-sm text-orange-700 mt-0.5">{showDetail.motivoObservacion}</p>
                  </div>
                  {showDetail.ciclosAprobacion > 1 && (
                    <Badge className="bg-orange-100 text-orange-700 shrink-0">Ciclo #{showDetail.ciclosAprobacion}</Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant="outline">{showDetail.moneda}</Badge>
                {showDetail.tipoCambio && <span className="text-xs text-muted-foreground">TC: {showDetail.tipoCambio}</span>}
                <span className="text-muted-foreground">{formatPeriod(showDetail.periodoInicio, showDetail.periodoFin)}</span>
              </div>

              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium mb-2">Avance del Proyecto</div>
                  <Row label="Presupuesto Contractual" value={formatCurrency(showDetail.presupuestoContractual, showDetail.moneda)} />
                  <Row label="Acumulado Anterior" value={formatCurrency(showDetail.acumuladoAnterior, showDetail.moneda)} />
                  <Row label="Monto Valorización" value={formatCurrency(showDetail.montoValorizacion, showDetail.moneda)} bold />
                  <Row label="Acumulado Actual" value={formatCurrency(showDetail.acumuladoActual, showDetail.moneda)} />
                  <Row label="Saldo por Valorizar" value={formatCurrency(showDetail.saldoPorValorizar, showDetail.moneda)} />
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min(showDetail.porcentajeAvance, 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs">{showDetail.porcentajeAvance.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium mb-2">Montos Financieros</div>
                  <Row label="Monto Valorización" value={formatCurrency(showDetail.montoValorizacion, showDetail.moneda)} />
                  {showDetail.descuentoComercialMonto > 0 && (
                    <Row label={`(-) Descuento (${showDetail.descuentoComercialPorcentaje}%)`} value={`-${formatCurrency(showDetail.descuentoComercialMonto, showDetail.moneda)}`} color="text-red-600" />
                  )}
                  {showDetail.adelantoMonto > 0 && (
                    <Row label={`(-) Adelanto (${showDetail.adelantoPorcentaje}%)`} value={`-${formatCurrency(showDetail.adelantoMonto, showDetail.moneda)}`} color="text-red-600" />
                  )}
                  <Row label="Subtotal" value={formatCurrency(showDetail.subtotal, showDetail.moneda)} border />
                  <Row label={`(+) IGV (${showDetail.igvPorcentaje}%)`} value={`+${formatCurrency(showDetail.igvMonto, showDetail.moneda)}`} />
                  {showDetail.fondoGarantiaMonto > 0 && (
                    <Row label={`(-) Fondo Garantía (${showDetail.fondoGarantiaPorcentaje}%)`} value={`-${formatCurrency(showDetail.fondoGarantiaMonto, showDetail.moneda)}`} color="text-orange-600" />
                  )}
                  <Row label="Neto a Recibir" value={formatCurrency(showDetail.netoARecibir, showDetail.moneda)} bold border />
                </CardContent>
              </Card>

              {/* Partidas (read-only) */}
              <TablaPartidas
                valorizacionId={showDetail.id}
                proyectoId={showDetail.proyectoId}
                readOnly={true}
                tieneCotizacion={false}
                onMontoChange={() => {}}
              />

              {showDetail.observaciones && (
                <div>
                  <span className="font-medium">Observaciones:</span>
                  <p className="text-muted-foreground mt-1">{showDetail.observaciones}</p>
                </div>
              )}
              {showDetail.fechaEnvio && <Row label="Fecha Envío" value={formatDate(showDetail.fechaEnvio)} />}
              {showDetail.fechaAprobacion && <Row label="Fecha Aprobación" value={formatDate(showDetail.fechaAprobacion)} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cambio de estado */}
      <Dialog open={showEstadoDialog} onOpenChange={open => { if (!open) { setShowEstadoDialog(false); setEstadoTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {estadoTarget?.estado === 'anulada' ? 'Anular Valorización' : 'Cambiar Estado'}
            </DialogTitle>
            <DialogDescription>
              {estadoTarget && `${estadoTarget.val.codigo} → ${getEstadoLabel(estadoTarget.estado)}`}
            </DialogDescription>
          </DialogHeader>
          {estadoTarget?.estado === 'anulada' && (
            <p className="text-sm text-red-600">
              Esta acción anulará la valorización. Las valorizaciones anuladas no se incluyen en el cálculo del acumulado.
            </p>
          )}
          {estadoTarget?.estado !== 'anulada' && (
            <p className="text-sm text-muted-foreground">
              ¿Confirmar cambio de estado a <strong>{estadoTarget && getEstadoLabel(estadoTarget.estado)}</strong>?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEstadoDialog(false); setEstadoTarget(null) }}>Cancelar</Button>
            <Button
              onClick={handleEstadoChange}
              disabled={saving}
              variant={estadoTarget?.estado === 'anulada' ? 'destructive' : 'default'}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog observar valorización */}
      <Dialog open={showObservarDialog} onOpenChange={open => { if (!open) { setShowObservarDialog(false); setObservarTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Observada</DialogTitle>
            <DialogDescription>
              {observarTarget && `${observarTarget.codigo} — ${observarTarget.proyecto?.codigo}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              La valorización será devuelta para corrección. Ingresa el motivo de la observación del cliente.
            </div>
            <div>
              <Label>Motivo de observación *</Label>
              <Textarea
                placeholder="Describe las observaciones del cliente..."
                value={motivoObservacion}
                onChange={e => setMotivoObservacion(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowObservarDialog(false); setObservarTarget(null) }}>Cancelar</Button>
            <Button onClick={handleObservar} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Marcar Observada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ValorizacionImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        proyectos={proyectos}
        onImported={loadData}
      />
    </div>
  )
}

const FLOW_STEPS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'observada', label: 'Observada' },
  { value: 'corregida', label: 'Corregida' },
  { value: 'aprobada_cliente', label: 'Aprobada Cliente' },
  { value: 'facturada', label: 'Facturada' },
  { value: 'pagada', label: 'Pagada' },
]

function ValorizacionFlowBanner({ estado }: { estado: string }) {
  if (estado === 'anulada') {
    return (
      <div className="flex items-center justify-center py-2">
        <Badge className="bg-red-100 text-red-700 text-sm px-4 py-1">Anulada</Badge>
      </div>
    )
  }

  const currentIdx = FLOW_STEPS.findIndex(s => s.value === estado)

  return (
    <div className="flex items-center gap-1 py-2 overflow-x-auto">
      {FLOW_STEPS.map((step, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx

        return (
          <React.Fragment key={step.value}>
            {idx > 0 && (
              <div className={`h-0.5 w-4 flex-shrink-0 ${isPast || isCurrent ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                isCurrent
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : isPast
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {(isPast || isCurrent) && <Check className="h-3 w-3" />}
              {step.label}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function Row({ label, value, bold, border, color }: { label: string; value: string; bold?: boolean; border?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between ${border ? 'border-t pt-1' : ''} ${bold ? 'font-bold' : ''} ${color || ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
