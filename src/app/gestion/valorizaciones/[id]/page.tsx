'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Save, Eye, Check, Upload, Trash2, Plus, Clock, DollarSign, FileText, Send, CheckCircle, AlertTriangle, RefreshCw, Ban, Undo2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { CONDICIONES_PAGO, FORMAS_PAGO, DIAS_CREDITO_PRESETS, formatPago } from '@/lib/utils/formaPago'
import TablaPartidas from '@/components/valorizacion/TablaPartidas'
import DetalleHH from '@/components/valorizacion/DetalleHH'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'
import { ValorizacionImportIAModal } from '@/components/gestion/ValorizacionImportIAModal'

interface ValorizacionAdjunto {
  id: string
  nombreArchivo: string
  urlArchivo: string | null
  driveFileId: string | null
  categoria: string | null
  createdAt: string
}

interface AbonoValorizacion {
  id: string
  cobroId: string
  monto: number
  fecha: string
  observaciones: string | null
}

interface CobroValorizacion {
  id: string
  valorizacionId: string
  tipo: string
  financiera: string | null
  tasaDescuentoPct: number | null
  fechaDesembolso: string | null
  fechaVencimiento: string | null
  numeroOperacion: string | null
  numeroDocumentos: number | null
  diasFinanciamiento: number | null
  detraccionPct: number | null
  detraccionMonto: number | null
  excedentePct: number | null
  excedenteMonto: number | null
  valorAFinanciar: number | null
  interesMonto: number | null
  comisionEstructuracion: number | null
  gastosAdicionales: number | null
  igvGastos: number | null
  montoADesembolsar: number | null
  adelantoBanpro: number | null
  saldoAGirar: number | null
  montoDescontado: number | null
  montoNeto: number | null
  confirmacionCliente: string | null
  fechaVencimientoPago: string | null
  observaciones: string | null
  abonos: AbonoValorizacion[]
}

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
  tipoConformidad?: string | null
  numeroHES?: string | null
  numeroGuiaRemision?: string | null
  fechaConformidad?: string | null
  fechaSolicitudHES?: string | null
  createdAt: string
  updatedAt: string
  proyecto?: Proyecto
  adjuntos?: ValorizacionAdjunto[]
  cobro?: CobroValorizacion | null
  valorizacionHH?: {
    id: string
    clienteId: string
    totalHorasReportadas: number
    totalHorasEquivalentes: number
    subtotal: number
    descuentoPct: number
    descuentoMonto: number
  } | null
}

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  { value: 'observada', label: 'Observada', color: 'bg-orange-100 text-orange-700' },
  { value: 'corregida', label: 'Corregida', color: 'bg-violet-100 text-violet-700' },
  { value: 'aprobada_cliente', label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'hes_pendiente', label: 'HES', color: 'bg-amber-100 text-amber-800' },
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

const ROLES_TRANSICION_CLIENT: Record<string, string[]> = {
  'borrador→enviada':               ['gestor', 'coordinador', 'gerente', 'admin'],
  'borrador→anulada':               ['gerente', 'admin'],
  'enviada→observada':              ['gestor', 'coordinador', 'gerente', 'admin'],
  'enviada→aprobada_cliente':       ['gestor', 'coordinador', 'gerente', 'admin'],
  'enviada→borrador':               ['gestor', 'coordinador', 'gerente', 'admin'],
  'enviada→anulada':                ['gerente', 'admin'],
  'observada→corregida':            ['gestor', 'coordinador', 'gerente', 'admin'],
  'observada→enviada':              ['gestor', 'coordinador', 'gerente', 'admin'],
  'observada→anulada':              ['gerente', 'admin'],
  'corregida→aprobada_cliente':     ['gestor', 'coordinador', 'gerente', 'admin'],
  'corregida→observada':            ['gestor', 'coordinador', 'gerente', 'admin'],
  'corregida→enviada':              ['gestor', 'coordinador', 'gerente', 'admin'],
  'corregida→anulada':              ['gerente', 'admin'],
  'aprobada_cliente→hes_pendiente': ['gestor', 'coordinador', 'gerente', 'administracion', 'admin'],
  'aprobada_cliente→enviada':       ['gerente', 'admin'],
  'aprobada_cliente→anulada':       ['gerente', 'admin'],
  'hes_pendiente→facturada':        ['gerente', 'administracion', 'admin'],
  'hes_pendiente→aprobada_cliente': ['gerente', 'administracion', 'admin'],
  'hes_pendiente→anulada':          ['gerente', 'admin'],
  'facturada→pagada':               ['gerente', 'administracion', 'admin'],
  'facturada→hes_pendiente':        ['gerente', 'administracion', 'admin'],
  'facturada→aprobada_cliente':     ['gerente', 'admin'],
  'facturada→anulada':              ['gerente', 'admin'],
  'pagada→facturada':               ['gerente', 'admin'],
  'pagada→anulada':                 ['gerente', 'admin'],
}

export default function ValorizacionEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewMode = searchParams.get('mode') === 'view'
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? ''
  const puedeTransicionar = (desde: string, hacia: string) =>
    (ROLES_TRANSICION_CLIENT[`${desde}→${hacia}`] ?? []).includes(userRole)

  const [val, setVal] = useState<Valorizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
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
  // Condiciones de pago de la valorización
  const [formCondicionPago, setFormCondicionPago] = useState('')
  const [formFormaPago, setFormFormaPago] = useState('')
  const [formDiasCredito, setFormDiasCredito] = useState('')
  const [formNotasPago, setFormNotasPago] = useState('')
  // Conformidad del cliente (HES, Guía de Remisión, acta) — editable en aprobada_cliente
  const [formTipoConformidad, setFormTipoConformidad] = useState('')
  const [formNumeroHES, setFormNumeroHES] = useState('')
  const [formNumeroGuiaRemision, setFormNumeroGuiaRemision] = useState('')
  const [formFechaConformidad, setFormFechaConformidad] = useState('')
  const [savingConformidad, setSavingConformidad] = useState(false)
  // HES upload
  const [uploadingHES, setUploadingHES] = useState(false)
  // Cobro form
  const [cobroTipo, setCobroTipo] = useState<'factoring' | 'directo'>('directo')
  const [cobroFinanciera, setCobroFinanciera] = useState('')
  const [cobroTasa, setCobroTasa] = useState('')
  const [cobroFechaDesembolso, setCobroFechaDesembolso] = useState('')
  const [cobroFechaVencimiento, setCobroFechaVencimiento] = useState('')
  const [cobroNumeroOperacion, setCobroNumeroOperacion] = useState('')
  const [cobroConfirmacion, setCobroConfirmacion] = useState('')
  const [cobroFechaVencimientoPago, setCobroFechaVencimientoPago] = useState('')
  const [cobroObservaciones, setCobroObservaciones] = useState('')
  // Factoring — liquidación detallada
  const [cobroNumDocumentos, setCobroNumDocumentos] = useState('')
  const [cobroDias, setCobroDias] = useState('')
  const [cobroDetraccionPct, setCobroDetraccionPct] = useState('12')
  const [cobroDetraccionMonto, setCobroDetraccionMonto] = useState('')
  const [cobroExcedentePct, setCobroExcedentePct] = useState('1')
  const [cobroExcedenteMonto, setCobroExcedenteMonto] = useState('')
  const [cobroValorAFinanciar, setCobroValorAFinanciar] = useState('')
  const [cobroInteres, setCobroInteres] = useState('')
  const [cobroComision, setCobroComision] = useState('')
  const [cobroGastos, setCobroGastos] = useState('')
  const [cobroIgvGastos, setCobroIgvGastos] = useState('')
  const [cobroAdelantoBanpro, setCobroAdelantoBanpro] = useState('')
  const [savingCobro, setSavingCobro] = useState(false)
  // Abono form
  const [showAbonoForm, setShowAbonoForm] = useState(false)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoFecha, setAbonoFecha] = useState(new Date().toISOString().split('T')[0])
  const [abonoObs, setAbonoObs] = useState('')
  const [addingAbono, setAddingAbono] = useState(false)
  // State transition
  const [transitioning, setTransitioning] = useState(false)
  // Dialogs de acciones
  const [showObservarDialog, setShowObservarDialog] = useState(false)
  const [motivoObservacion, setMotivoObservacion] = useState('')
  const [showAnularDialog, setShowAnularDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // IA Verificar modal
  const [showIAVerificar, setShowIAVerificar] = useState(false)
  const [iaEnabled, setIaEnabled] = useState(false)

  const loadVal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/gestion/valorizaciones/${id}`)
      if (!res.ok) {
        toast.error('Error al cargar valorización')
        router.push('/gestion/valorizaciones')
        return
      }
      const data: Valorizacion = await res.json()
      setVal(data)
      // Populate form
      setFormMontoValorizacion(data.montoValorizacion.toString())
      setFormPeriodoInicio(data.periodoInicio.split('T')[0])
      setFormPeriodoFin(data.periodoFin.split('T')[0])
      setFormDescuento(data.descuentoComercialPorcentaje.toString())
      setFormAdelanto(data.adelantoPorcentaje.toString())
      setFormIgv(data.igvPorcentaje.toString())
      setFormFondoGarantia(data.fondoGarantiaPorcentaje.toString())
      setFormMoneda(data.moneda)
      setFormTipoCambio(data.tipoCambio?.toString() || '')
      setShowTipoCambio(!!data.tipoCambio)
      setFormObservaciones(data.observaciones || '')
      setFormCondicionPago((data as any).condicionPago || '')
      setFormFormaPago((data as any).formaPago || '')
      setFormDiasCredito((data as any).diasCredito?.toString() || '')
      setFormNotasPago((data as any).notasPago || '')
      setFormTipoConformidad(data.tipoConformidad || '')
      setFormNumeroHES(data.numeroHES || '')
      setFormNumeroGuiaRemision(data.numeroGuiaRemision || '')
      setFormFechaConformidad(data.fechaConformidad ? data.fechaConformidad.split('T')[0] : '')
      if (data.cobro) {
        const c = data.cobro
        setCobroTipo((c.tipo as 'factoring' | 'directo') || 'directo')
        setCobroFinanciera(c.financiera || '')
        setCobroTasa(c.tasaDescuentoPct?.toString() || '')
        setCobroFechaDesembolso(c.fechaDesembolso ? c.fechaDesembolso.split('T')[0] : '')
        setCobroFechaVencimiento(c.fechaVencimiento ? c.fechaVencimiento.split('T')[0] : '')
        setCobroNumeroOperacion(c.numeroOperacion || '')
        setCobroNumDocumentos(c.numeroDocumentos?.toString() || '')
        setCobroDias(c.diasFinanciamiento?.toString() || '')
        setCobroDetraccionPct(c.detraccionPct?.toString() || '12')
        setCobroDetraccionMonto(c.detraccionMonto?.toString() || '')
        setCobroExcedentePct(c.excedentePct?.toString() || '1')
        setCobroExcedenteMonto(c.excedenteMonto?.toString() || '')
        setCobroValorAFinanciar(c.valorAFinanciar?.toString() || '')
        setCobroInteres(c.interesMonto?.toString() || '')
        setCobroComision(c.comisionEstructuracion?.toString() || '')
        setCobroGastos(c.gastosAdicionales?.toString() || '')
        setCobroIgvGastos(c.igvGastos?.toString() || '')
        setCobroAdelantoBanpro(c.adelantoBanpro?.toString() || '')
        setCobroConfirmacion(c.confirmacionCliente || '')
        setCobroFechaVencimientoPago(c.fechaVencimientoPago ? c.fechaVencimientoPago.split('T')[0] : '')
        setCobroObservaciones(c.observaciones || '')
      }
    } catch {
      toast.error('Error al cargar valorización')
      router.push('/gestion/valorizaciones')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { loadVal() }, [loadVal])

  useEffect(() => {
    fetch('/api/agente/features')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setIaEnabled(data.importarValorizacionIA !== false) })
      .catch(() => {})
  }, [])

  const readOnly = viewMode || (val?.estado !== 'borrador')

  const handleMontoFromPartidas = useCallback((monto: number) => {
    setFormMontoValorizacion(monto.toString())
  }, [])

  const handleSave = async () => {
    if (!val) return
    if (!formPeriodoInicio || !formPeriodoFin) {
      toast.error('Periodo inicio y fin son requeridos')
      return
    }
    if (new Date(formPeriodoFin) <= new Date(formPeriodoInicio)) {
      toast.error('Periodo Fin debe ser posterior a Periodo Inicio')
      return
    }
    setSaving(true)
    try {
      const payload = {
        montoValorizacion: parseFloat(formMontoValorizacion) || 0,
        periodoInicio: formPeriodoInicio,
        periodoFin: formPeriodoFin,
        descuentoComercialPorcentaje: parseFloat(formDescuento) || 0,
        adelantoPorcentaje: parseFloat(formAdelanto) || 0,
        igvPorcentaje: parseFloat(formIgv) || 18,
        fondoGarantiaPorcentaje: parseFloat(formFondoGarantia) || 0,
        moneda: formMoneda,
        tipoCambio: formTipoCambio ? parseFloat(formTipoCambio) : null,
        observaciones: formObservaciones || null,
        condicionPago: formCondicionPago || null,
        formaPago: formFormaPago || null,
        diasCredito: formDiasCredito ? parseInt(formDiasCredito) : null,
        notasPago: formNotasPago || null,
      }
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Valorización actualizada')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Guardar Conformidad del cliente (independiente de los campos generales).
  // Editable cuando estado >= aprobada_cliente y antes de facturar.
  const conformidadValida = (): string | null => {
    if (!formTipoConformidad) return 'Selecciona el tipo de conformidad'
    if (!formFechaConformidad) return 'Ingresa la fecha de conformidad'
    if (formTipoConformidad === 'hes' && !formNumeroHES.trim()) return 'Ingresa el N° HES'
    if (formTipoConformidad === 'guia_remision' && !formNumeroGuiaRemision.trim()) return 'Ingresa el N° Guía de Remisión'
    return null
  }

  const handleSaveConformidad = async () => {
    if (!val) return
    const error = conformidadValida()
    if (error) { toast.error(error); return }
    setSavingConformidad(true)
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoConformidad: formTipoConformidad || null,
          numeroHES: formNumeroHES || null,
          numeroGuiaRemision: formNumeroGuiaRemision || null,
          fechaConformidad: formFechaConformidad || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Conformidad registrada')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar conformidad')
    } finally {
      setSavingConformidad(false)
    }
  }

  const handleTransicion = async (newEstado: string) => {
    if (!val) return
    setTransitioning(true)
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Estado actualizado')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al cambiar estado')
    } finally {
      setTransitioning(false)
    }
  }

  const handleObservar = async () => {
    if (!val || !motivoObservacion.trim()) {
      toast.error('Ingresa el motivo de la observación')
      return
    }
    setTransitioning(true)
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'observada', motivoObservacion: motivoObservacion.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Valorización marcada como observada')
      setShowObservarDialog(false)
      setMotivoObservacion('')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al observar')
    } finally {
      setTransitioning(false)
    }
  }

  const handleDeleteVal = async () => {
    if (!val) return
    setTransitioning(true)
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Valorización eliminada')
      router.push('/gestion/valorizaciones')
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
      setTransitioning(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUploadAdjunto = async (e: React.ChangeEvent<HTMLInputElement>, categoria: string) => {
    if (!val || !e.target.files?.[0]) return
    const file = e.target.files[0]
    setUploadingHES(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('categoria', categoria)
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}/adjuntos`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Documento adjuntado')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al subir archivo')
    } finally {
      setUploadingHES(false)
      e.target.value = ''
    }
  }

  const handleDeleteAdjunto = async (adjId: string) => {
    if (!val) return
    if (!window.confirm('¿Eliminar este adjunto?')) return
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}/adjuntos/${adjId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast.success('Adjunto eliminado')
      loadVal()
    } catch {
      toast.error('Error al eliminar adjunto')
    }
  }

  const handleSaveCobro = async () => {
    if (!val) return
    setSavingCobro(true)
    try {
      const body: Record<string, any> = { tipo: cobroTipo }
      if (cobroTipo === 'factoring') {
        const liq = liquidacion
        body.financiera = cobroFinanciera || null
        body.tasaDescuentoPct = cobroTasa ? parseFloat(cobroTasa) : null
        body.fechaDesembolso = cobroFechaDesembolso || null
        body.fechaVencimiento = cobroFechaVencimiento || null
        body.numeroOperacion = cobroNumeroOperacion || null
        body.numeroDocumentos = cobroNumDocumentos ? parseInt(cobroNumDocumentos) : null
        body.diasFinanciamiento = cobroDias ? parseInt(cobroDias) : null
        body.detraccionPct = cobroDetraccionPct ? parseFloat(cobroDetraccionPct) : null
        body.detraccionMonto = liq.detMonto
        body.excedentePct = cobroExcedentePct ? parseFloat(cobroExcedentePct) : null
        body.excedenteMonto = liq.excMonto
        body.valorAFinanciar = liq.aFinanciar
        body.interesMonto = cobroInteres ? parseFloat(cobroInteres) : null
        body.comisionEstructuracion = cobroComision ? parseFloat(cobroComision) : null
        body.gastosAdicionales = cobroGastos ? parseFloat(cobroGastos) : null
        body.igvGastos = cobroIgvGastos ? parseFloat(cobroIgvGastos) : null
        body.montoADesembolsar = liq.aDesembolsar
        body.adelantoBanpro = cobroAdelantoBanpro ? parseFloat(cobroAdelantoBanpro) : null
        body.saldoAGirar = liq.saldo
        body.montoDescontado = liq.totalCostos
        body.montoNeto = liq.aDesembolsar
      } else {
        body.confirmacionCliente = cobroConfirmacion || null
        body.fechaVencimientoPago = cobroFechaVencimientoPago || null
        body.observaciones = cobroObservaciones || null
      }
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}/cobro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Cobro guardado')
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar cobro')
    } finally {
      setSavingCobro(false)
    }
  }

  const handleAddAbono = async () => {
    if (!val || !abonoMonto || !abonoFecha) return
    setAddingAbono(true)
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}/cobro/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: parseFloat(abonoMonto), fecha: abonoFecha, observaciones: abonoObs || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Abono registrado')
      setAbonoMonto('')
      setAbonoFecha(new Date().toISOString().split('T')[0])
      setAbonoObs('')
      setShowAbonoForm(false)
      loadVal()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar abono')
    } finally {
      setAddingAbono(false)
    }
  }

  const handleDeleteAbono = async (abonoId: string) => {
    if (!val) return
    if (!window.confirm('¿Eliminar este abono?')) return
    try {
      const res = await fetch(`/api/proyectos/${val.proyectoId}/valorizaciones/${val.id}/cobro/abonos?abonoId=${abonoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast.success('Abono eliminado')
      loadVal()
    } catch {
      toast.error('Error al eliminar abono')
    }
  }

  // Factoring liquidation calculations
  const liquidacion = useMemo(() => {
    const base = val?.netoARecibir ?? 0
    const detPct = parseFloat(cobroDetraccionPct) || 0
    const detMonto = parseFloat(cobroDetraccionMonto) || (base * detPct / 100)
    const valorNeto = base - detMonto

    const excPct = parseFloat(cobroExcedentePct) || 0
    const excMonto = parseFloat(cobroExcedenteMonto) || (valorNeto * excPct / 100)
    const aFinanciar = parseFloat(cobroValorAFinanciar) || (valorNeto - excMonto)

    const interes = parseFloat(cobroInteres) || 0
    const comision = parseFloat(cobroComision) || 0
    const gastos = parseFloat(cobroGastos) || 0
    const igv = parseFloat(cobroIgvGastos) || 0
    const totalCostos = interes + comision + gastos + igv

    const aDesembolsar = aFinanciar - totalCostos
    const adelanto = parseFloat(cobroAdelantoBanpro) || 0
    const saldo = aDesembolsar - adelanto

    // Reference interest: aFinanciar × (tasa%/30) × días
    const tasa = parseFloat(cobroTasa) || 0
    const dias = parseInt(cobroDias) || 0
    const refInteres = tasa > 0 && dias > 0 ? aFinanciar * (tasa / 100 / 30) * dias : 0

    return { base, detMonto, valorNeto, excMonto, aFinanciar, totalCostos, aDesembolsar, saldo, refInteres }
  }, [val, cobroDetraccionPct, cobroDetraccionMonto, cobroExcedentePct, cobroExcedenteMonto,
      cobroValorAFinanciar, cobroInteres, cobroComision, cobroGastos, cobroIgvGastos,
      cobroAdelantoBanpro, cobroTasa, cobroDias])

  // Preview calculation
  const preview = useMemo(() => {
    const monto = parseFloat(formMontoValorizacion) || 0
    const desc = monto * (parseFloat(formDescuento) || 0) / 100

    const proy = val?.proyecto
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
  }, [formMontoValorizacion, formDescuento, formAdelanto, formIgv, formFondoGarantia, val])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!val) return null

  return (
    <>
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/gestion/valorizaciones')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{viewMode ? val.codigo : `Editar ${val.codigo}`}</h1>
              <Badge className={getEstadoColor(val.estado)}>{getEstadoLabel(val.estado)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{val.proyecto?.codigo} — {val.proyecto?.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {iaEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIAVerificar(true)}
              className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Verificar con documento
            </Button>
          )}
          {viewMode && val.estado === 'borrador' && (
            <Button variant="outline" size="sm" onClick={() => router.replace(`/gestion/valorizaciones/${id}`)}>
              <Eye className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {/* View mode: flow banner */}
      {viewMode && <ValorizacionFlowBanner estado={val.estado} />}

      {/* Observación alert */}
      {(['observada', 'corregida'].includes(val.estado)) && val.motivoObservacion && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium text-orange-800">Observación del cliente</div>
            <p className="text-sm text-orange-700 mt-0.5">{val.motivoObservacion}</p>
          </div>
          {val.ciclosAprobacion > 1 && (
            <Badge className="bg-orange-100 text-orange-700 shrink-0">Ciclo #{val.ciclosAprobacion}</Badge>
          )}
        </div>
      )}

      {/* Panel de acciones — visible siempre en modo vista, o cuando no es borrador editable */}
      {(val.estado !== 'borrador' || viewMode) && (() => {
        const tiene = (desde: string, hacia: string) => puedeTransicionar(desde, hacia)
        const acciones: React.ReactNode[] = []

        // Enviar
        if (val.estado === 'borrador' && tiene('borrador', 'enviada'))
          acciones.push(
            <Button key="enviar" size="sm" onClick={() => handleTransicion('enviada')} disabled={transitioning}>
              <Send className="h-4 w-4 mr-2" />
              Enviar valorización al cliente
            </Button>
          )
        // Aprobar
        if (['enviada', 'corregida'].includes(val.estado) && tiene(val.estado, 'aprobada_cliente'))
          acciones.push(
            <Button key="aprobar" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleTransicion('aprobada_cliente')} disabled={transitioning}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar valorización
            </Button>
          )
        // Observar
        if (['enviada', 'corregida'].includes(val.estado) && tiene(val.estado, 'observada'))
          acciones.push(
            <Button key="observar" size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => { setMotivoObservacion(''); setShowObservarDialog(true) }} disabled={transitioning}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Marcar como Observada
            </Button>
          )
        // Enviar corrección
        if (val.estado === 'observada' && tiene('observada', 'corregida'))
          acciones.push(
            <Button key="corregida" size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => handleTransicion('corregida')} disabled={transitioning}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Enviar corrección al cliente
            </Button>
          )
        // Facturar
        if (val.estado === 'hes_pendiente' && tiene('hes_pendiente', 'facturada'))
          acciones.push(
            <Button key="facturar" size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleTransicion('facturada')} disabled={transitioning}>
              <DollarSign className="h-4 w-4 mr-2" />
              Registrar factura
            </Button>
          )
        // Marcar pagada
        if (val.estado === 'facturada' && tiene('facturada', 'pagada'))
          acciones.push(
            <Button key="pagada" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleTransicion('pagada')} disabled={transitioning}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como pagada
            </Button>
          )
        // Reversiones
        if (val.estado === 'aprobada_cliente' && tiene('aprobada_cliente', 'enviada'))
          acciones.push(
            <Button key="rev-aprobada" size="sm" variant="outline" onClick={() => handleTransicion('enviada')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir aprobación a Enviada
            </Button>
          )
        if (['enviada', 'corregida'].includes(val.estado) && tiene(val.estado, 'borrador'))
          acciones.push(
            <Button key="rev-borrador" size="sm" variant="outline" onClick={() => handleTransicion('borrador')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir a Borrador
            </Button>
          )
        if (val.estado === 'observada' && tiene('observada', 'enviada'))
          acciones.push(
            <Button key="rev-obs" size="sm" variant="outline" onClick={() => handleTransicion('enviada')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir a Enviada
            </Button>
          )
        if (val.estado === 'hes_pendiente' && tiene('hes_pendiente', 'aprobada_cliente'))
          acciones.push(
            <Button key="rev-hes" size="sm" variant="outline" onClick={() => handleTransicion('aprobada_cliente')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir a Aprobada
            </Button>
          )
        if (val.estado === 'facturada' && tiene('facturada', 'hes_pendiente'))
          acciones.push(
            <Button key="rev-fact" size="sm" variant="outline" onClick={() => handleTransicion('hes_pendiente')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir a HES
            </Button>
          )
        if (val.estado === 'pagada' && tiene('pagada', 'facturada'))
          acciones.push(
            <Button key="rev-pag" size="sm" variant="outline" onClick={() => handleTransicion('facturada')} disabled={transitioning}>
              <Undo2 className="h-4 w-4 mr-2" />
              Revertir a Facturada
            </Button>
          )
        // Anular
        if (val.estado !== 'anulada' && tiene(val.estado, 'anulada'))
          acciones.push(
            <Button key="anular" size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowAnularDialog(true)} disabled={transitioning}>
              <Ban className="h-4 w-4 mr-2" />
              Anular valorización
            </Button>
          )
        // Eliminar
        if (['borrador', 'anulada'].includes(val.estado))
          acciones.push(
            <Button key="eliminar" size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)} disabled={transitioning}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar permanentemente
            </Button>
          )

        if (acciones.length === 0) return null
        return (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Acciones disponibles</p>
              <div className="flex flex-wrap gap-2">
                {acciones}
                {transitioning && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Config financiera compacta */}
      <Card className={readOnly ? 'bg-muted/20' : 'bg-muted/30 border-dashed'}>
        <CardContent className="p-4">
          {readOnly ? (
            /* Read-only: mostrar valores como texto */
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Periodo</span>
                <span className="font-medium">{formatDate(val.periodoInicio)} — {formatDate(val.periodoFin)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Moneda</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">{val.moneda}</Badge>
                  {val.tipoCambio && <span className="text-xs text-muted-foreground">TC: {val.tipoCambio}</span>}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Descuento</span>
                <span className="font-mono">{val.descuentoComercialPorcentaje}%</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Adelanto</span>
                <span className="font-mono">{val.adelantoPorcentaje}%</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">IGV</span>
                <span className="font-mono">{val.igvPorcentaje}%</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Fondo Garantía</span>
                <span className="font-mono">{val.fondoGarantiaPorcentaje}%</span>
              </div>
              {val.observaciones && (
                <div className="col-span-full">
                  <span className="text-xs text-muted-foreground block">Observaciones</span>
                  <span>{val.observaciones}</span>
                </div>
              )}
            </div>
          ) : (
            /* Editable: inputs compactos */
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="col-span-2">
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
                  {showTipoCambio ? (
                    <Input type="number" step="0.001" placeholder="TC" className="h-7 text-xs mt-1" value={formTipoCambio} onChange={e => setFormTipoCambio(e.target.value)} />
                  ) : (
                    <button type="button" className="text-[10px] text-blue-600 hover:underline mt-0.5" onClick={() => setShowTipoCambio(true)}>
                      + Tipo de cambio
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Descuento %</Label>
                  <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formDescuento} onChange={e => setFormDescuento(e.target.value)} />
                </div>
                {(() => {
                  const proy = val.proyecto
                  const proyAdelanto = proy && (proy.adelantoMonto ?? 0) > 0
                    ? { adelantoPorcentaje: proy.adelantoPorcentaje ?? 0, adelantoMonto: proy.adelantoMonto ?? 0, adelantoAmortizado: proy.adelantoAmortizado ?? 0 }
                    : null
                  if (!proyAdelanto) {
                    return (
                      <div>
                        <Label className="text-xs text-muted-foreground">Adelanto %</Label>
                        <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                      </div>
                    )
                  }
                  const saldoDisponible = proyAdelanto.adelantoMonto - proyAdelanto.adelantoAmortizado
                  if (saldoDisponible <= 0) {
                    return (
                      <div>
                        <Label className="text-xs text-muted-foreground">Adelanto</Label>
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] mt-1">Amortizado 100%</Badge>
                      </div>
                    )
                  }
                  const monto = parseFloat(formMontoValorizacion) || 0
                  const calc = calcularAdelantoValorizacion(proyAdelanto, monto)
                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground">Adelanto % <span className="text-[10px]">({proyAdelanto.adelantoPorcentaje}%)</span></Label>
                      <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Saldo: {formatCurrency(saldoDisponible, proy?.moneda || 'PEN')}
                        {calc.adelantoMonto > 0 && ` | -${formatCurrency(calc.adelantoMonto, proy?.moneda || 'PEN')}`}
                      </p>
                    </div>
                  )
                })()}
                <div>
                  <Label className="text-xs text-muted-foreground">IGV %</Label>
                  <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formIgv} onChange={e => setFormIgv(e.target.value)} />
                  <div className="mt-1.5">
                    <Label className="text-xs text-muted-foreground">Fondo Garantía %</Label>
                    <Input type="number" step="0.01" className="h-8 text-xs mt-1" value={formFondoGarantia} onChange={e => setFormFondoGarantia(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Input placeholder="Observaciones..." className="h-8 text-xs" value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)} />
              </div>

              {/* Condiciones de pago de esta valorización */}
              <div className="mt-3 pt-3 border-t">
                <Label className="text-xs text-muted-foreground font-semibold">Condiciones de pago</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Condición</Label>
                    <Select
                      value={formCondicionPago || '__none__'}
                      onValueChange={v => {
                        const next = v === '__none__' ? '' : v
                        setFormCondicionPago(next)
                        if (next !== 'credito') setFormDiasCredito('')
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__"><span className="text-muted-foreground">—</span></SelectItem>
                        {CONDICIONES_PAGO.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma</Label>
                    <Select
                      value={formFormaPago || '__none__'}
                      onValueChange={v => setFormFormaPago(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__"><span className="text-muted-foreground">—</span></SelectItem>
                        {FORMAS_PAGO.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formCondicionPago === 'credito' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Días</Label>
                      <Input
                        type="number"
                        min={0}
                        list="dias-credito-presets"
                        className="h-8 text-xs"
                        value={formDiasCredito}
                        onChange={e => setFormDiasCredito(e.target.value)}
                        placeholder="30"
                      />
                      <datalist id="dias-credito-presets">
                        {DIAS_CREDITO_PRESETS.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Notas (hitos, aclaraciones)</Label>
                  <Input
                    placeholder='Ej: "30% adelanto al firmar, 70% contra entrega"'
                    className="h-8 text-xs"
                    value={formNotasPago}
                    onChange={e => setFormNotasPago(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Vista solo lectura: mostrar condiciones de pago si están definidas */}
          {readOnly && val && ((val as any).condicionPago || (val as any).notasPago) && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground block">Condiciones de pago</span>
              <span className="text-sm font-medium">
                {formatPago((val as any).condicionPago, (val as any).formaPago, (val as any).diasCredito)}
              </span>
              {(val as any).notasPago && (
                <p className="text-xs text-muted-foreground mt-1 italic">{(val as any).notasPago}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conformidad del cliente — visible desde aprobada_cliente en adelante.
          Editable en aprobada_cliente, hes_pendiente y facturada (por si se completó después de facturar). */}
      {val && ['aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada', 'anulada'].includes(val.estado) && (() => {
        const editable = ['aprobada_cliente', 'hes_pendiente', 'facturada'].includes(val.estado)
        const tieneConformidad = !!(
          val.tipoConformidad &&
          val.fechaConformidad &&
          (val.tipoConformidad === 'hes' ? val.numeroHES :
           val.tipoConformidad === 'guia_remision' ? val.numeroGuiaRemision :
           true)
        )
        return (
          <Card className={editable && !tieneConformidad ? 'border-amber-300 bg-amber-50/30' : ''}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Conformidad del cliente</h3>
                  <p className="text-xs text-muted-foreground">
                    Documento que el cliente emite al aprobar la valorización (HES, Guía de Remisión o acta).
                    Habilita la facturación y se hereda a la CxC.
                  </p>
                </div>
                {!editable && tieneConformidad && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                    Registrada
                  </span>
                )}
              </div>

              {editable && !tieneConformidad && (
                <div className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded px-2 py-1">
                  ⚠ Conformidad pendiente — captúrala antes de facturar.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de conformidad</Label>
                  {editable ? (
                    <Select value={formTipoConformidad || '__none__'} onValueChange={v => setFormTipoConformidad(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sin especificar —</SelectItem>
                        <SelectItem value="hes">HES (Hoja de Entrada de Servicios)</SelectItem>
                        <SelectItem value="guia_remision">Guía de Remisión</SelectItem>
                        <SelectItem value="acta">Acta de conformidad</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium">
                      {val.tipoConformidad === 'hes' ? 'HES' :
                       val.tipoConformidad === 'guia_remision' ? 'Guía de Remisión' :
                       val.tipoConformidad === 'acta' ? 'Acta de conformidad' :
                       val.tipoConformidad === 'otro' ? 'Otro' : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Fecha de conformidad</Label>
                  {editable ? (
                    <Input type="date" value={formFechaConformidad} onChange={e => setFormFechaConformidad(e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium">
                      {val.fechaConformidad
                        ? new Date(val.fechaConformidad).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">N° HES <span className="text-muted-foreground">(servicios)</span></Label>
                  {editable ? (
                    <Input placeholder="HES-1000123" value={formNumeroHES} onChange={e => setFormNumeroHES(e.target.value)} />
                  ) : (
                    <p className="text-sm font-mono font-medium">{val.numeroHES || '—'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">N° Guía de Remisión <span className="text-muted-foreground">(bienes)</span></Label>
                  {editable ? (
                    <Input placeholder="T001-12345" value={formNumeroGuiaRemision} onChange={e => setFormNumeroGuiaRemision(e.target.value)} />
                  ) : (
                    <p className="text-sm font-mono font-medium">{val.numeroGuiaRemision || '—'}</p>
                  )}
                </div>
              </div>

              {editable && (
                <div className="flex items-center justify-end gap-2">
                  <Button onClick={handleSaveConformidad} disabled={savingConformidad} size="sm" variant="outline">
                    {savingConformidad && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar Conformidad
                  </Button>
                  {val.estado === 'aprobada_cliente' && puedeTransicionar('aprobada_cliente', 'hes_pendiente') && (
                    <Button
                      size="sm"
                      disabled={!tieneConformidad || transitioning}
                      onClick={() => handleTransicion('hes_pendiente')}
                      title={!tieneConformidad ? 'Guarda la conformidad primero' : 'Avanzar al estado HES'}
                    >
                      {transitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Registrar HES →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* HES Adjuntos card — visible in hes_pendiente state */}
      {val.estado === 'hes_pendiente' && (
        <Card className="border-amber-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Documentos HES / Guía de Almacén
                </h3>
                {val.fechaSolicitudHES && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Solicitada el {formatDate(val.fechaSolicitudHES)}
                    {' · '}{Math.floor((Date.now() - new Date(val.fechaSolicitudHES).getTime()) / 86_400_000)} días
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="cursor-pointer">
                  <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={e => handleUploadAdjunto(e, 'hes')} disabled={uploadingHES} />
                  <Button size="sm" variant="outline" asChild disabled={uploadingHES}>
                    <span>{uploadingHES ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}HES</span>
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={e => handleUploadAdjunto(e, 'guia_almacen')} disabled={uploadingHES} />
                  <Button size="sm" variant="outline" asChild disabled={uploadingHES}>
                    <span><Upload className="h-4 w-4 mr-1" />Guía Almacén</span>
                  </Button>
                </label>
              </div>
            </div>

            {val.adjuntos && val.adjuntos.filter(a => ['hes', 'guia_almacen'].includes(a.categoria ?? '')).length > 0 ? (
              <div className="space-y-1.5">
                {val.adjuntos.filter(a => ['hes', 'guia_almacen'].includes(a.categoria ?? '')).map(adj => (
                  <div key={adj.id} className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <a href={adj.urlArchivo ?? '#'} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">
                      {adj.nombreArchivo}
                    </a>
                    <Badge className="text-[10px] bg-amber-100 text-amber-700 shrink-0">
                      {adj.categoria === 'hes' ? 'HES' : 'Guía Almacén'}
                    </Badge>
                    <button onClick={() => handleDeleteAdjunto(adj.id)} className="text-red-400 hover:text-red-600 ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Sin documentos adjuntos. Se requiere HES o Guía de Almacén para poder facturar.
              </p>
            )}
          </CardContent>
        </Card>
      )}


      {/* HH detail OR partidas table */}
      {val.valorizacionHH ? (
        <DetalleHH
          valorizacionHHId={val.valorizacionHH.id}
          estado={val.estado}
          moneda={val.moneda}
        />
      ) : (
        <TablaPartidas
          valorizacionId={val.id}
          proyectoId={val.proyectoId}
          readOnly={readOnly}
          tieneCotizacion={!!val.proyecto?.cotizacionId}
          onMontoChange={handleMontoFromPartidas}
        />
      )}

      {/* Resumen financiero */}
      {parseFloat(formMontoValorizacion) > 0 && (
        <Card className="bg-muted/20 border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-sm">
              <div className="text-center">
                <span className="text-xs text-muted-foreground block">Monto Val.</span>
                <span className="font-mono font-semibold">{formatCurrency(parseFloat(formMontoValorizacion) || 0, formMoneda)}</span>
              </div>
              {preview.descuento > 0 && (
                <div className="text-center text-red-600">
                  <span className="text-xs block">(-) Descuento</span>
                  <span className="font-mono">-{formatCurrency(preview.descuento, formMoneda)}</span>
                </div>
              )}
              {preview.adelanto > 0 && (
                <div className="text-center text-red-600">
                  <span className="text-xs block">(-) Adelanto</span>
                  <span className="font-mono">-{formatCurrency(preview.adelanto, formMoneda)}</span>
                </div>
              )}
              <div className="text-center bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700 rounded-lg p-2">
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 block">Subtotal sin IGV</span>
                <span className="font-mono font-bold text-lg text-teal-700 dark:text-teal-300">{formatCurrency(preview.subtotal, formMoneda)}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground block">(+) IGV {formIgv}%</span>
                <span className="font-mono text-muted-foreground">+{formatCurrency(preview.igv, formMoneda)}</span>
              </div>
              {preview.fondoGarantia > 0 && (
                <div className="text-center text-orange-600">
                  <span className="text-xs block">(-) F. Garantía</span>
                  <span className="font-mono">-{formatCurrency(preview.fondoGarantia, formMoneda)}</span>
                </div>
              )}
              <div className="text-center rounded-lg p-2">
                <span className="text-xs text-muted-foreground block">Neto c/ IGV</span>
                <span className="font-mono font-semibold text-sm">{formatCurrency(preview.netoARecibir, formMoneda)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View mode: extra info */}
      {viewMode && (
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          {val.fechaEnvio && <span>Enviada: {formatDate(val.fechaEnvio)}</span>}
          {val.fechaAprobacion && <span>Aprobada: {formatDate(val.fechaAprobacion)}</span>}
          {val.fechaObservacion && <span>Observada: {formatDate(val.fechaObservacion)}</span>}
          {val.fechaCorreccion && <span>Corregida: {formatDate(val.fechaCorreccion)}</span>}
        </div>
      )}
    </div>

    {/* Dialog: Marcar como Observada */}
    <Dialog open={showObservarDialog} onOpenChange={open => { if (!open) setShowObservarDialog(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Observada</DialogTitle>
          <DialogDescription>{val.codigo} — la valorización será devuelta para corrección</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            Ingresa el motivo de la observación del cliente para que el gestor pueda corregirla.
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
          <Button variant="outline" onClick={() => setShowObservarDialog(false)}>Cancelar</Button>
          <Button onClick={handleObservar} disabled={transitioning} className="bg-orange-600 hover:bg-orange-700">
            {transitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Marcar Observada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog: Anular */}
    <Dialog open={showAnularDialog} onOpenChange={open => { if (!open) setShowAnularDialog(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Anular Valorización</DialogTitle>
          <DialogDescription>{val.codigo} — {val.proyecto?.codigo}</DialogDescription>
        </DialogHeader>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium text-red-700">Al anular esta valorización:</p>
          <ul className="list-disc pl-5 text-red-600 space-y-0.5">
            <li>Pasará a estado <strong>Anulada</strong> de forma permanente</li>
            <li>No se incluirá en el cálculo del acumulado del proyecto</li>
            {['aprobada_cliente', 'facturada', 'pagada'].includes(val.estado) && (
              <li>Se revertirá la amortización de adelanto</li>
            )}
            {['facturada', 'pagada'].includes(val.estado) && (
              <li>Las cuentas por cobrar asociadas serán <strong>anuladas</strong></li>
            )}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAnularDialog(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => { setShowAnularDialog(false); handleTransicion('anulada') }} disabled={transitioning}>
            {transitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Anulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog: Eliminar */}
    <Dialog open={showDeleteDialog} onOpenChange={open => { if (!open) setShowDeleteDialog(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Valorización</DialogTitle>
          <DialogDescription>{val.codigo} — {val.proyecto?.codigo}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-red-600">
          Esta acción eliminará permanentemente la valorización, sus partidas y adjuntos. No se puede deshacer.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDeleteVal} disabled={transitioning}>
            {transitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Eliminar permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal: Verificar con documento IA */}
    {iaEnabled && val && (
      <ValorizacionImportIAModal
        open={showIAVerificar}
        onClose={() => setShowIAVerificar(false)}
        proyectoId={val.proyectoId}
        valorizacionId={val.id}
      />
    )}
    </>
  )
}

// Flow banner
const FLOW_STEPS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'observada', label: 'Observada' },
  { value: 'corregida', label: 'Corregida' },
  { value: 'aprobada_cliente', label: 'Aprobada' },
  { value: 'hes_pendiente', label: 'HES' },
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
    <div className="flex items-center gap-1 py-1 overflow-x-auto">
      {FLOW_STEPS.map((step, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx

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
