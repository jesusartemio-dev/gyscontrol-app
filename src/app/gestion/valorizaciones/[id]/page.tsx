'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Eye, Check, Upload, Trash2, Plus, Clock, DollarSign, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { CONDICIONES_PAGO, FORMAS_PAGO, DIAS_CREDITO_PRESETS, formatPago } from '@/lib/utils/formaPago'
import TablaPartidas from '@/components/valorizacion/TablaPartidas'
import DetalleHH from '@/components/valorizacion/DetalleHH'
import { calcularAdelantoValorizacion } from '@/lib/utils/adelantoUtils'

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
  montoDescontado: number | null
  montoNeto: number | null
  fechaDesembolso: string | null
  fechaVencimiento: string | null
  numeroOperacion: string | null
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
  { value: 'hes_pendiente', label: 'HES Pendiente', color: 'bg-amber-100 text-amber-800' },
  { value: 'facturada', label: 'Facturada', color: 'bg-purple-100 text-purple-700' },
  { value: 'en_cobro', label: 'En Cobro', color: 'bg-cyan-100 text-cyan-800' },
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

export default function ValorizacionEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewMode = searchParams.get('mode') === 'view'

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
  const [cobroMontoDescontado, setCobroMontoDescontado] = useState('')
  const [cobroMontoNeto, setCobroMontoNeto] = useState('')
  const [cobroFechaDesembolso, setCobroFechaDesembolso] = useState('')
  const [cobroFechaVencimiento, setCobroFechaVencimiento] = useState('')
  const [cobroNumeroOperacion, setCobroNumeroOperacion] = useState('')
  const [cobroConfirmacion, setCobroConfirmacion] = useState('')
  const [cobroFechaVencimientoPago, setCobroFechaVencimientoPago] = useState('')
  const [cobroObservaciones, setCobroObservaciones] = useState('')
  const [savingCobro, setSavingCobro] = useState(false)
  // Abono form
  const [showAbonoForm, setShowAbonoForm] = useState(false)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonoFecha, setAbonoFecha] = useState(new Date().toISOString().split('T')[0])
  const [abonoObs, setAbonoObs] = useState('')
  const [addingAbono, setAddingAbono] = useState(false)
  // State transition
  const [transitioning, setTransitioning] = useState(false)

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
        setCobroTipo((data.cobro.tipo as 'factoring' | 'directo') || 'directo')
        setCobroFinanciera(data.cobro.financiera || '')
        setCobroTasa(data.cobro.tasaDescuentoPct?.toString() || '')
        setCobroMontoDescontado(data.cobro.montoDescontado?.toString() || '')
        setCobroMontoNeto(data.cobro.montoNeto?.toString() || '')
        setCobroFechaDesembolso(data.cobro.fechaDesembolso ? data.cobro.fechaDesembolso.split('T')[0] : '')
        setCobroFechaVencimiento(data.cobro.fechaVencimiento ? data.cobro.fechaVencimiento.split('T')[0] : '')
        setCobroNumeroOperacion(data.cobro.numeroOperacion || '')
        setCobroConfirmacion(data.cobro.confirmacionCliente || '')
        setCobroFechaVencimientoPago(data.cobro.fechaVencimientoPago ? data.cobro.fechaVencimientoPago.split('T')[0] : '')
        setCobroObservaciones(data.cobro.observaciones || '')
      }
    } catch {
      toast.error('Error al cargar valorización')
      router.push('/gestion/valorizaciones')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { loadVal() }, [loadVal])

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
  const handleSaveConformidad = async () => {
    if (!val) return
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
        body.financiera = cobroFinanciera || null
        body.tasaDescuentoPct = cobroTasa ? parseFloat(cobroTasa) : null
        body.montoDescontado = cobroMontoDescontado ? parseFloat(cobroMontoDescontado) : null
        body.montoNeto = cobroMontoNeto ? parseFloat(cobroMontoNeto) : null
        body.fechaDesembolso = cobroFechaDesembolso || null
        body.fechaVencimiento = cobroFechaVencimiento || null
        body.numeroOperacion = cobroNumeroOperacion || null
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
          {/* Workflow transition buttons */}
          {val.estado === 'aprobada_cliente' && (
            <Button size="sm" variant="outline" onClick={() => handleTransicion('hes_pendiente')} disabled={transitioning}>
              {transitioning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Clock className="h-4 w-4 mr-1" />}
              Solicitar HES
            </Button>
          )}
          {val.estado === 'hes_pendiente' && (() => {
            const hasHES = val.adjuntos?.some(a => ['hes', 'guia_almacen'].includes(a.categoria ?? '')) ?? false
            return (
              <Button size="sm" onClick={() => handleTransicion('facturada')} disabled={!hasHES || transitioning}
                title={!hasHES ? 'Adjuntar HES o Guía de Almacén primero' : undefined}>
                {transitioning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                Facturar{!hasHES && <span className="ml-1 text-[10px] opacity-60">(falta HES)</span>}
              </Button>
            )
          })()}
          {val.estado === 'facturada' && (
            <Button size="sm" variant="outline" onClick={() => handleTransicion('en_cobro')} disabled={transitioning}>
              {transitioning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
              Iniciar Cobro
            </Button>
          )}
          {val.estado === 'en_cobro' && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleTransicion('pagada')} disabled={transitioning}>
              {transitioning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Marcar Pagada
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
          Editable solo cuando la valorización está en aprobada_cliente (antes de facturar).
          Al facturar, los campos se heredan automáticamente a la CxC creada. */}
      {val && ['aprobada_cliente', 'hes_pendiente', 'facturada', 'en_cobro', 'pagada', 'anulada'].includes(val.estado) && (() => {
        const editable = val.estado === 'aprobada_cliente' && !viewMode
        const tieneConformidad = !!(val.numeroHES || val.numeroGuiaRemision || val.fechaConformidad)
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
                <div className="flex justify-end">
                  <Button onClick={handleSaveConformidad} disabled={savingConformidad} size="sm">
                    {savingConformidad && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar Conformidad
                  </Button>
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

      {/* Cobro card — visible from facturada onwards */}
      {['facturada', 'en_cobro', 'pagada'].includes(val.estado) && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Gestión de Cobro
            </h3>

            {/* Tipo selector */}
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de cobro</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={cobroTipo === 'directo' ? 'default' : 'outline'} onClick={() => setCobroTipo('directo')}>Cobro directo</Button>
                <Button size="sm" variant={cobroTipo === 'factoring' ? 'default' : 'outline'} onClick={() => setCobroTipo('factoring')}>Factoring</Button>
              </div>
            </div>

            {/* Factoring fields */}
            {cobroTipo === 'factoring' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Financiera</Label>
                  <Input placeholder="Banpro, etc." className="mt-1" value={cobroFinanciera} onChange={e => setCobroFinanciera(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Tasa de descuento %</Label>
                  <Input type="number" step="0.01" className="mt-1" value={cobroTasa} onChange={e => setCobroTasa(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Monto descontado</Label>
                  <Input type="number" step="0.01" className="mt-1" value={cobroMontoDescontado} onChange={e => setCobroMontoDescontado(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Monto neto recibido</Label>
                  <Input type="number" step="0.01" className="mt-1" value={cobroMontoNeto} onChange={e => setCobroMontoNeto(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Fecha desembolso</Label>
                  <Input type="date" className="mt-1" value={cobroFechaDesembolso} onChange={e => setCobroFechaDesembolso(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Fecha vencimiento factoring</Label>
                  <Input type="date" className="mt-1" value={cobroFechaVencimiento} onChange={e => setCobroFechaVencimiento(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">N° Operación</Label>
                  <Input placeholder="OP-2025-001" className="mt-1" value={cobroNumeroOperacion} onChange={e => setCobroNumeroOperacion(e.target.value)} />
                </div>
              </div>
            )}

            {/* Directo fields */}
            {cobroTipo === 'directo' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Confirmación cliente</Label>
                  <Select value={cobroConfirmacion || '__none__'} onValueChange={v => setCobroConfirmacion(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="— Seleccionar —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Sin confirmar —</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="en_disputa">En disputa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha vencimiento pago</Label>
                  <Input type="date" className="mt-1" value={cobroFechaVencimientoPago} onChange={e => setCobroFechaVencimientoPago(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Observaciones</Label>
                  <Input className="mt-1" value={cobroObservaciones} onChange={e => setCobroObservaciones(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveCobro} disabled={savingCobro}>
                {savingCobro && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar cobro
              </Button>
            </div>

            {/* Abonos section */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Pagos / Abonos</h4>
                <Button size="sm" variant="outline" onClick={() => setShowAbonoForm(v => !v)}>
                  <Plus className="h-4 w-4 mr-1" />Agregar abono
                </Button>
              </div>

              {showAbonoForm && (
                <div className="flex flex-wrap gap-2 items-end p-2 bg-muted/30 rounded">
                  <div>
                    <Label className="text-xs">Monto</Label>
                    <Input type="number" step="0.01" className="h-8 w-36 mt-1" value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha</Label>
                    <Input type="date" className="h-8 mt-1" value={abonoFecha} onChange={e => setAbonoFecha(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-32">
                    <Label className="text-xs">Observaciones</Label>
                    <Input className="h-8 mt-1" value={abonoObs} onChange={e => setAbonoObs(e.target.value)} />
                  </div>
                  <Button size="sm" onClick={handleAddAbono} disabled={addingAbono || !abonoMonto || !abonoFecha}>
                    {addingAbono ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agregar'}
                  </Button>
                </div>
              )}

              {val.cobro && val.cobro.abonos.length > 0 ? (
                <div className="space-y-1">
                  {val.cobro.abonos.map(abono => (
                    <div key={abono.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground text-xs w-24 shrink-0">{formatDate(abono.fecha)}</span>
                      <span className="font-mono font-medium">{formatCurrency(abono.monto, val.moneda)}</span>
                      {abono.observaciones && <span className="text-xs text-muted-foreground flex-1 truncate">{abono.observaciones}</span>}
                      <button onClick={() => handleDeleteAbono(abono.id)} className="text-red-400 hover:text-red-600 ml-auto shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(() => {
                    const totalAbonado = val.cobro.abonos.reduce((s, a) => s + a.monto, 0)
                    const saldo = val.netoARecibir - totalAbonado
                    return (
                      <div className="flex justify-between text-sm pt-2 font-medium">
                        <span>Total abonado: <span className="font-mono">{formatCurrency(totalAbonado, val.moneda)}</span></span>
                        <span className={saldo > 0 ? 'text-orange-600' : 'text-emerald-600'}>
                          Saldo: <span className="font-mono">{formatCurrency(saldo, val.moneda)}</span>
                        </span>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sin pagos registrados.</p>
              )}
            </div>
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
              <div className="text-center">
                <span className="text-xs text-muted-foreground block">Subtotal</span>
                <span className="font-mono">{formatCurrency(preview.subtotal, formMoneda)}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground block">(+) IGV</span>
                <span className="font-mono">+{formatCurrency(preview.igv, formMoneda)}</span>
              </div>
              {preview.fondoGarantia > 0 && (
                <div className="text-center text-orange-600">
                  <span className="text-xs block">(-) F. Garantía</span>
                  <span className="font-mono">-{formatCurrency(preview.fondoGarantia, formMoneda)}</span>
                </div>
              )}
              <div className="text-center bg-primary/5 rounded-lg p-2">
                <span className="text-xs font-medium block">Neto a Recibir</span>
                <span className="font-mono font-bold text-base text-primary">{formatCurrency(preview.netoARecibir, formMoneda)}</span>
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
  { value: 'en_cobro', label: 'En Cobro' },
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
