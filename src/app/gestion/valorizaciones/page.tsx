'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileSpreadsheet, Loader2, Search, Eye, Send, CheckCircle, Edit, Ban, Upload, Download, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import ValorizacionImportExcelModal from '@/components/gestion/ValorizacionImportExcelModal'
import { exportarValAExcel } from '@/lib/utils/valorizacionExcel'

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
  const router = useRouter()
  const [items, setItems] = useState<Valorizacion[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProyecto, setFilterProyecto] = useState<string>('all')
  const [filterEstado, setFilterEstado] = useState<string>('all')

  // Form fields (create only)
  const [formProyectoId, setFormProyectoId] = useState('')
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

  // Eliminar dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Valorizacion | null>(null)

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
    setFormProyectoId('')
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

  const handleCreate = async () => {
    if (!formPeriodoInicio || !formPeriodoFin) {
      toast.error('Periodo inicio y fin son requeridos')
      return
    }
    if (new Date(formPeriodoFin) <= new Date(formPeriodoInicio)) {
      toast.error('Periodo Fin debe ser posterior a Periodo Inicio')
      return
    }
    if (!formProyectoId) {
      toast.error('Selecciona un proyecto')
      return
    }
    setSaving(true)
    try {
      const payload = {
        montoValorizacion: 0,
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

      const res = await fetch(`/api/proyectos/${formProyectoId}/valorizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      const creada: Valorizacion = await res.json()
      toast.success('Valorización creada — ahora agrega las partidas')
      setShowForm(false)
      resetForm()
      // Navigate to edit page
      router.push(`/gestion/valorizaciones/${creada.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${deleteTarget.proyectoId}/valorizaciones/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Valorización eliminada')
      setShowDeleteDialog(false)
      setDeleteTarget(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

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
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/gestion/valorizaciones/${item.id}?mode=view`)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.estado === 'borrador' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/gestion/valorizaciones/${item.id}`)} title="Editar">
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
                        {['borrador', 'anulada'].includes(item.estado) && (
                          <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget(item); setShowDeleteDialog(true) }} title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
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

      {/* Dialog crear */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Valorización</DialogTitle>
            <DialogDescription>
              Selecciona un proyecto y completa los datos. Luego podrás agregar las partidas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
                  <button type="button" className="text-xs text-blue-600 hover:underline mt-1" onClick={() => setShowTipoCambio(true)}>
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
                <div>
                  <Label>Adelanto %</Label>
                  <Input type="number" step="0.01" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear y agregar partidas
            </Button>
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

      {/* Dialog eliminar valorización */}
      <Dialog open={showDeleteDialog} onOpenChange={open => { if (!open) { setShowDeleteDialog(false); setDeleteTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Valorización</DialogTitle>
            <DialogDescription>
              {deleteTarget && `${deleteTarget.codigo} — ${deleteTarget.proyecto?.codigo}`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-red-600">
            Esta acción eliminará permanentemente la valorización, sus partidas y adjuntos. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null) }}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={saving} variant="destructive">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
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

