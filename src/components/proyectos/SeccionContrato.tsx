'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Pencil,
  Save,
  X,
  Loader2,
  Shield,
  Plus,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'

import type { Proyecto } from '@/types'

// ─── Types ───

interface CartaFianza {
  id: string
  proyectoId: string
  tipo: string
  estado: string
  entidadFinanciera: string
  numeroCarta: string | null
  moneda: string
  monto: number
  fechaEmision: string
  fechaVencimiento: string
  notas: string | null
  cartaRenovadaId: string | null
  createdAt: string
  updatedAt: string
  adjuntos: { id: string; nombreArchivo: string; urlArchivo: string }[]
  cartaRenovada?: { id: string; numeroCarta: string | null; tipo: string } | null
  renovaciones?: { id: string; numeroCarta: string | null; estado: string; fechaVencimiento: string }[]
}

interface Props {
  proyecto: Proyecto
  onUpdateProyecto: (updated: Partial<Proyecto>) => void
}

// ─── Helpers ───

const TIPO_LABELS: Record<string, string> = {
  fiel_cumplimiento: 'Fiel Cumplimiento',
  adelanto: 'Adelanto',
  garantia: 'Garantía',
  beneficios_sociales: 'Beneficios Sociales',
}

const ESTADO_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por Vencer',
  vencida: 'Vencida',
  ejecutada: 'Ejecutada',
  devuelta: 'Devuelta',
  renovada: 'Renovada',
}

const ESTADO_COLORS: Record<string, string> = {
  vigente: 'bg-emerald-100 text-emerald-700',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencida: 'bg-red-100 text-red-700',
  ejecutada: 'bg-purple-100 text-purple-700',
  devuelta: 'bg-gray-100 text-gray-700',
  renovada: 'bg-blue-100 text-blue-700',
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatCurrency = (amount: number, moneda: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const diasRestantes = (fecha: string) => {
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Component ───

export default function SeccionContrato({ proyecto, onUpdateProyecto }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editingContrato, setEditingContrato] = useState(false)
  const [savingContrato, setSavingContrato] = useState(false)
  const [cartas, setCartas] = useState<CartaFianza[]>([])
  const [loadingCartas, setLoadingCartas] = useState(false)

  // Contrato edit fields
  const [form, setForm] = useState({
    numeroContrato: '',
    fechaFirmaContrato: '',
    fechaInicioContrato: '',
    fechaFinContrato: '',
    fondoGarantiaPct: '0',
    descuentoComercialPct: '0',
    igvPct: '18',
    condicionPago: '',
    diasCredito: '',
  })

  // Carta fianza modal
  const [showCartaModal, setShowCartaModal] = useState(false)
  const [editingCarta, setEditingCarta] = useState<CartaFianza | null>(null)
  const [renovandoCarta, setRenovandoCarta] = useState<CartaFianza | null>(null)
  const [savingCarta, setSavingCarta] = useState(false)
  const [deleteCartaId, setDeleteCartaId] = useState<string | null>(null)
  const [deletingCarta, setDeletingCarta] = useState(false)

  const [cartaForm, setCartaForm] = useState({
    tipo: 'fiel_cumplimiento',
    entidadFinanciera: '',
    numeroCarta: '',
    moneda: 'USD',
    monto: '',
    fechaEmision: '',
    fechaVencimiento: '',
    notas: '',
  })

  // ─── Data loading ───

  const loadCartas = useCallback(async () => {
    setLoadingCartas(true)
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/cartas-fianza`)
      if (res.ok) {
        const data = await res.json()
        setCartas(data.cartas || [])
      }
    } catch {
      // silent
    } finally {
      setLoadingCartas(false)
    }
  }, [proyecto.id])

  useEffect(() => {
    if (expanded) loadCartas()
  }, [expanded, loadCartas])

  // ─── Contrato edit ───

  const startEditingContrato = () => {
    setForm({
      numeroContrato: proyecto.numeroContrato || '',
      fechaFirmaContrato: proyecto.fechaFirmaContrato ? proyecto.fechaFirmaContrato.split('T')[0] : '',
      fechaInicioContrato: proyecto.fechaInicioContrato ? proyecto.fechaInicioContrato.split('T')[0] : '',
      fechaFinContrato: proyecto.fechaFinContrato ? proyecto.fechaFinContrato.split('T')[0] : '',
      fondoGarantiaPct: String(proyecto.fondoGarantiaPct ?? 0),
      descuentoComercialPct: String(proyecto.descuentoComercialPct ?? 0),
      igvPct: String(proyecto.igvPct ?? 18),
      condicionPago: proyecto.condicionPago || '',
      diasCredito: proyecto.diasCredito != null ? String(proyecto.diasCredito) : '',
    })
    setEditingContrato(true)
  }

  const saveContrato = async () => {
    setSavingContrato(true)
    try {
      const payload: Record<string, unknown> = {
        fondoGarantiaPct: parseFloat(form.fondoGarantiaPct) || 0,
        descuentoComercialPct: parseFloat(form.descuentoComercialPct) || 0,
        igvPct: parseFloat(form.igvPct) || 18,
      }
      if (form.numeroContrato) payload.numeroContrato = form.numeroContrato
      if (form.fechaFirmaContrato) payload.fechaFirmaContrato = form.fechaFirmaContrato
      if (form.fechaInicioContrato) payload.fechaInicioContrato = form.fechaInicioContrato
      if (form.fechaFinContrato) payload.fechaFinContrato = form.fechaFinContrato
      if (form.condicionPago) payload.condicionPago = form.condicionPago
      if (form.diasCredito) payload.diasCredito = parseInt(form.diasCredito)

      const res = await fetch(`/api/proyectos/${proyecto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const { data } = await res.json()
      onUpdateProyecto(data)
      setEditingContrato(false)
      toast.success('Datos de contrato actualizados')
    } catch {
      toast.error('Error al guardar contrato')
    } finally {
      setSavingContrato(false)
    }
  }

  // ─── Carta fianza CRUD ───

  const openNewCarta = () => {
    setEditingCarta(null)
    setRenovandoCarta(null)
    setCartaForm({
      tipo: 'fiel_cumplimiento',
      entidadFinanciera: '',
      numeroCarta: '',
      moneda: proyecto.moneda || 'USD',
      monto: '',
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      notas: '',
    })
    setShowCartaModal(true)
  }

  const openEditCarta = (carta: CartaFianza) => {
    setEditingCarta(carta)
    setRenovandoCarta(null)
    setCartaForm({
      tipo: carta.tipo,
      entidadFinanciera: carta.entidadFinanciera,
      numeroCarta: carta.numeroCarta || '',
      moneda: carta.moneda,
      monto: String(carta.monto),
      fechaEmision: carta.fechaEmision.split('T')[0],
      fechaVencimiento: carta.fechaVencimiento.split('T')[0],
      notas: carta.notas || '',
    })
    setShowCartaModal(true)
  }

  const openRenovarCarta = (carta: CartaFianza) => {
    setEditingCarta(null)
    setRenovandoCarta(carta)
    setCartaForm({
      tipo: carta.tipo,
      entidadFinanciera: carta.entidadFinanciera,
      numeroCarta: '',
      moneda: carta.moneda,
      monto: String(carta.monto),
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      notas: `Renovación de carta ${carta.numeroCarta || carta.id.slice(-6)}`,
    })
    setShowCartaModal(true)
  }

  const saveCarta = async () => {
    if (!cartaForm.entidadFinanciera || !cartaForm.monto || !cartaForm.fechaVencimiento) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setSavingCarta(true)
    try {
      if (editingCarta) {
        // Update
        const res = await fetch(`/api/proyectos/${proyecto.id}/cartas-fianza`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCarta.id,
            tipo: cartaForm.tipo,
            entidadFinanciera: cartaForm.entidadFinanciera,
            numeroCarta: cartaForm.numeroCarta || undefined,
            moneda: cartaForm.moneda,
            monto: parseFloat(cartaForm.monto),
            fechaEmision: cartaForm.fechaEmision,
            fechaVencimiento: cartaForm.fechaVencimiento,
            notas: cartaForm.notas || undefined,
          }),
        })
        if (!res.ok) throw new Error('Error al actualizar')
        toast.success('Carta fianza actualizada')
      } else {
        // Create (new or renovation)
        const body: Record<string, unknown> = {
          tipo: cartaForm.tipo,
          entidadFinanciera: cartaForm.entidadFinanciera,
          numeroCarta: cartaForm.numeroCarta || undefined,
          moneda: cartaForm.moneda,
          monto: parseFloat(cartaForm.monto),
          fechaEmision: cartaForm.fechaEmision,
          fechaVencimiento: cartaForm.fechaVencimiento,
          notas: cartaForm.notas || undefined,
        }
        if (renovandoCarta) {
          body.cartaRenovadaId = renovandoCarta.id
        }
        const res = await fetch(`/api/proyectos/${proyecto.id}/cartas-fianza`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Error al crear')
        toast.success(renovandoCarta ? 'Carta renovada exitosamente' : 'Carta fianza creada')
      }
      setShowCartaModal(false)
      loadCartas()
    } catch {
      toast.error('Error al guardar carta fianza')
    } finally {
      setSavingCarta(false)
    }
  }

  const confirmDeleteCarta = async () => {
    if (!deleteCartaId) return
    setDeletingCarta(true)
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/cartas-fianza?id=${deleteCartaId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Carta fianza eliminada')
      setDeleteCartaId(null)
      loadCartas()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingCarta(false)
    }
  }

  // ─── Derived ───

  const hasContrato = !!(proyecto.numeroContrato || proyecto.fechaFirmaContrato)
  const cartasActivas = cartas.filter(c => ['vigente', 'por_vencer'].includes(c.estado))
  const cartasAlerta = cartas.filter(c => c.estado === 'por_vencer' || c.estado === 'vencida')

  // ─── Render ───

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.32 }}
      >
        <Card>
          <CardContent className="p-0">
            {/* Header — always visible */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Contrato</span>
                  {proyecto.numeroContrato && (
                    <Badge variant="outline" className="h-5 px-1.5 text-xs font-mono">
                      {proyecto.numeroContrato}
                    </Badge>
                  )}
                </div>
                {cartasActivas.length > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">Cartas Fianza</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">{cartasActivas.length}</Badge>
                    </div>
                  </>
                )}
                {cartasAlerta.length > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {cartasAlerta.length} alerta{cartasAlerta.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded content */}
            {expanded && (
              <div className="border-t px-4 py-3 space-y-4">
                {/* Datos del Contrato */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Datos del Contrato</h4>
                    {!editingContrato ? (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={startEditingContrato}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-green-700" onClick={saveContrato} disabled={savingContrato}>
                          {savingContrato ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingContrato(false)} disabled={savingContrato}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingContrato ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">N° Contrato</Label>
                        <Input value={form.numeroContrato} onChange={e => setForm({ ...form, numeroContrato: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Fecha Firma</Label>
                        <Input type="date" value={form.fechaFirmaContrato} onChange={e => setForm({ ...form, fechaFirmaContrato: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Inicio Contrato</Label>
                        <Input type="date" value={form.fechaInicioContrato} onChange={e => setForm({ ...form, fechaInicioContrato: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Fin Contrato</Label>
                        <Input type="date" value={form.fechaFinContrato} onChange={e => setForm({ ...form, fechaFinContrato: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">IGV (%)</Label>
                        <Input type="number" step="0.01" value={form.igvPct} onChange={e => setForm({ ...form, igvPct: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Fondo Garantía (%)</Label>
                        <Input type="number" step="0.01" value={form.fondoGarantiaPct} onChange={e => setForm({ ...form, fondoGarantiaPct: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Descuento Comercial (%)</Label>
                        <Input type="number" step="0.01" value={form.descuentoComercialPct} onChange={e => setForm({ ...form, descuentoComercialPct: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Condición de Pago</Label>
                        <Input value={form.condicionPago} onChange={e => setForm({ ...form, condicionPago: e.target.value })} placeholder="ej: Contra entrega" className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Días Crédito</Label>
                        <Input type="number" value={form.diasCredito} onChange={e => setForm({ ...form, diasCredito: e.target.value })} className="h-8 text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">N° Contrato</div>
                        <div className="font-medium">{proyecto.numeroContrato || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Fecha Firma</div>
                        <div className="font-medium">{formatDate(proyecto.fechaFirmaContrato)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Inicio</div>
                        <div className="font-medium">{formatDate(proyecto.fechaInicioContrato)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Fin</div>
                        <div className="font-medium">{formatDate(proyecto.fechaFinContrato)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">IGV</div>
                        <div className="font-medium">{proyecto.igvPct ?? 18}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Fondo Garantía</div>
                        <div className="font-medium">{proyecto.fondoGarantiaPct ?? 0}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Descuento Comercial</div>
                        <div className="font-medium">{proyecto.descuentoComercialPct ?? 0}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Condición / Crédito</div>
                        <div className="font-medium">
                          {proyecto.condicionPago || '—'}
                          {proyecto.diasCredito != null && proyecto.diasCredito > 0 && ` (${proyecto.diasCredito} días)`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cartas Fianza */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Cartas de Fianza</h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={openNewCarta}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nueva Carta
                    </Button>
                  </div>

                  {loadingCartas ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cargando...
                    </div>
                  ) : cartas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No hay cartas de fianza registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {cartas.map(carta => {
                        const dias = diasRestantes(carta.fechaVencimiento)
                        return (
                          <div
                            key={carta.id}
                            className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Badge className={`text-xs shrink-0 ${ESTADO_COLORS[carta.estado] || 'bg-gray-100 text-gray-700'}`}>
                                {ESTADO_LABELS[carta.estado] || carta.estado}
                              </Badge>
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {TIPO_LABELS[carta.tipo] || carta.tipo}
                                  {carta.numeroCarta && <span className="text-muted-foreground ml-1 font-mono text-xs">#{carta.numeroCarta}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {carta.entidadFinanciera} · {formatCurrency(carta.monto, carta.moneda)} · vence {formatDate(carta.fechaVencimiento)}
                                  {(carta.estado === 'vigente' || carta.estado === 'por_vencer') && (
                                    <span className={dias <= 30 ? ' text-amber-600 font-medium' : ''}>
                                      {' '}({dias > 0 ? `${dias}d` : 'hoy'})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {['vigente', 'por_vencer'].includes(carta.estado) && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openRenovarCarta(carta)} title="Renovar">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEditCarta(carta)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600" onClick={() => setDeleteCartaId(carta.id)} title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal Carta Fianza */}
      <Dialog open={showCartaModal} onOpenChange={setShowCartaModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCarta ? 'Editar Carta Fianza' : renovandoCarta ? 'Renovar Carta Fianza' : 'Nueva Carta Fianza'}
            </DialogTitle>
            <DialogDescription>
              {renovandoCarta
                ? `Renovación de ${TIPO_LABELS[renovandoCarta.tipo]} #${renovandoCarta.numeroCarta || renovandoCarta.id.slice(-6)}`
                : 'Registra los datos de la carta de fianza.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={cartaForm.tipo} onValueChange={v => setCartaForm({ ...cartaForm, tipo: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Entidad Financiera *</Label>
              <Input value={cartaForm.entidadFinanciera} onChange={e => setCartaForm({ ...cartaForm, entidadFinanciera: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">N° Carta</Label>
              <Input value={cartaForm.numeroCarta} onChange={e => setCartaForm({ ...cartaForm, numeroCarta: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select value={cartaForm.moneda} onValueChange={v => setCartaForm({ ...cartaForm, moneda: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PEN">PEN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Monto *</Label>
              <Input type="number" step="0.01" value={cartaForm.monto} onChange={e => setCartaForm({ ...cartaForm, monto: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Fecha Emisión</Label>
              <Input type="date" value={cartaForm.fechaEmision} onChange={e => setCartaForm({ ...cartaForm, fechaEmision: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Fecha Vencimiento *</Label>
              <Input type="date" value={cartaForm.fechaVencimiento} onChange={e => setCartaForm({ ...cartaForm, fechaVencimiento: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notas</Label>
              <Textarea value={cartaForm.notas} onChange={e => setCartaForm({ ...cartaForm, notas: e.target.value })} rows={2} className="text-sm" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCartaModal(false)} disabled={savingCarta}>
              Cancelar
            </Button>
            <Button onClick={saveCarta} disabled={savingCarta}>
              {savingCarta && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCarta ? 'Guardar' : renovandoCarta ? 'Renovar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!deleteCartaId} onOpenChange={(open) => { if (!open) setDeleteCartaId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Carta Fianza</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la carta de fianza y todos sus adjuntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCarta}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCarta} disabled={deletingCarta} className="bg-red-600 hover:bg-red-700">
              {deletingCarta && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
