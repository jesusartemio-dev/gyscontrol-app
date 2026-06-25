'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, ArrowLeft, Pencil, Save, Plus, Trash2, ExternalLink, DollarSign, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  confirmacionCliente: string | null
  fechaVencimientoPago: string | null
  observaciones: string | null
  abonos: AbonoValorizacion[]
}

interface PagoCobro {
  id: string
  monto: number
  fechaPago: string
  medioPago: string
  numeroOperacion: string | null
  observaciones: string | null
  esDetraccion: boolean
  detraccionPorcentaje: number | null
  detraccionMonto: number | null
  detraccionFechaPago: string | null
  numeroConstanciaBN: string | null
  esRetencion: boolean
  retencionPorcentaje: number | null
  retencionMonto: number | null
  retencionNumeroConstancia: string | null
  cuentaBancaria: { id: string; nombreBanco: string; numeroCuenta: string } | null
}

interface CxCDetalle {
  id: string
  proyectoId: string
  clienteId: string
  valorizacionId: string | null
  numeroDocumento: string | null
  descripcion: string | null
  monto: number
  moneda: string
  tipoCambio: number | null
  montoPagado: number
  saldoPendiente: number
  fechaEmision: string
  fechaRecepcion: string | null
  fechaVencimiento: string
  condicionPago: string | null
  diasCredito: number | null
  bancoFinanciera: string | null
  ordenCompraCliente: string | null
  numeroHES: string | null
  numeroGuiaRemision: string | null
  numeroNegociacion: string | null
  estado: string
  observaciones: string | null
  proyecto: { id: string; codigo: string; nombre: string }
  cliente: { id: string; nombre: string; ruc: string | null }
  valorizacion: { id: string; codigo: string; numero: number; proyectoId: string; cobro: CobroValorizacion | null } | null
  pagos: PagoCobro[]
}

interface CuentaBancaria {
  id: string
  nombreBanco: string
  numeroCuenta: string
  moneda: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

const formatCurrency = (n: number, moneda: string) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(n)

const n = (v: string) => parseFloat(v) || 0

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  parcial:   'bg-blue-100 text-blue-800',
  pagada:    'bg-green-100 text-green-800',
  vencida:   'bg-red-100 text-red-800',
  anulada:   'bg-gray-100 text-gray-500',
}

const MEDIO_PAGO_OPTIONS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'deposito',      label: 'Depósito' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function CxCDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [cxc, setCxc] = useState<CxCDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [bancos, setBancos] = useState<CuentaBancaria[]>([])

  // ── Pago al cliente ──────────────────────────────────────────────────────
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [pagoMonto, setPagoMonto]           = useState('')
  const [pagoFecha, setPagoFecha]           = useState(new Date().toISOString().split('T')[0])
  const [pagoMedio, setPagoMedio]           = useState('transferencia')
  const [pagoOperacion, setPagoOperacion]   = useState('')
  const [pagoBancoId, setPagoBancoId]       = useState('none')
  const [pagoObs, setPagoObs]               = useState('')
  const [conDetraccion, setConDetraccion]   = useState(false)
  const [detPct, setDetPct]                 = useState('12')
  const [detCodigo, setDetCodigo]           = useState('')
  const [detFecha, setDetFecha]             = useState('')
  const [detBancoId, setDetBancoId]         = useState('none')
  const [detConstancia, setDetConstancia]   = useState('')
  const [conRetencion, setConRetencion]     = useState(false)
  const [retPct, setRetPct]                 = useState('3')
  const [retFecha, setRetFecha]             = useState('')
  const [retConstancia, setRetConstancia]   = useState('')
  const [savingPago, setSavingPago]         = useState(false)

  // ── Cobro / Factoring ────────────────────────────────────────────────────
  const [showCobroForm, setShowCobroForm]   = useState(false)
  const [cobroTipo, setCobroTipo]           = useState<'factoring' | 'directo'>('factoring')
  const [cobroFinanciera, setCobroFinanciera]           = useState('')
  const [cobroTasa, setCobroTasa]                       = useState('')
  const [cobroFechaDesembolso, setCobroFechaDesembolso] = useState('')
  const [cobroFechaVencimiento, setCobroFechaVencimiento] = useState('')
  const [cobroNumeroOperacion, setCobroNumeroOperacion] = useState('')
  const [cobroNumDocumentos, setCobroNumDocumentos]     = useState('')
  const [cobroDias, setCobroDias]                       = useState('')
  const [cobroDetraccionPct, setCobroDetraccionPct]     = useState('12')
  const [cobroDetraccionMonto, setCobroDetraccionMonto] = useState('')
  const [cobroExcedentePct, setCobroExcedentePct]       = useState('1')
  const [cobroExcedenteMonto, setCobroExcedenteMonto]   = useState('')
  const [cobroValorAFinanciar, setCobroValorAFinanciar] = useState('')
  const [cobroInteres, setCobroInteres]                 = useState('')
  const [cobroComision, setCobroComision]               = useState('')
  const [cobroGastos, setCobroGastos]                   = useState('')
  const [cobroIgvGastos, setCobroIgvGastos]             = useState('')
  const [cobroAdelantoBanpro, setCobroAdelantoBanpro]   = useState('')
  const [cobroConfirmacion, setCobroConfirmacion]       = useState('')
  const [cobroFechaVencPago, setCobroFechaVencPago]     = useState('')
  const [cobroObs, setCobroObs]                         = useState('')
  const [savingCobro, setSavingCobro]                   = useState(false)

  // Abonos
  const [showAbonoForm, setShowAbonoForm]   = useState(false)
  const [abonoMonto, setAbonoMonto]         = useState('')
  const [abonoFecha, setAbonoFecha]         = useState(new Date().toISOString().split('T')[0])
  const [abonoObs, setAbonoObs]             = useState('')
  const [savingAbono, setSavingAbono]       = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cxcRes, bancosRes] = await Promise.all([
        fetch(`/api/administracion/cuentas-cobrar/${id}`),
        fetch('/api/administracion/cuentas-bancarias'),
      ])
      if (!cxcRes.ok) { toast.error('CxC no encontrada'); router.push('/administracion/cuentas-cobrar'); return }
      const data: CxCDetalle = await cxcRes.json()
      setCxc(data)
      if (bancosRes.ok) {
        const b = await bancosRes.json()
        setBancos(b.filter((x: any) => x.activa))
      }
      // Populate cobro form if exists
      const cobro = data.valorizacion?.cobro
      if (cobro) {
        setCobroTipo((cobro.tipo as 'factoring' | 'directo') || 'factoring')
        setCobroFinanciera(cobro.financiera || '')
        setCobroTasa(cobro.tasaDescuentoPct?.toString() || '')
        setCobroFechaDesembolso(cobro.fechaDesembolso ? cobro.fechaDesembolso.split('T')[0] : '')
        setCobroFechaVencimiento(cobro.fechaVencimiento ? cobro.fechaVencimiento.split('T')[0] : '')
        setCobroNumeroOperacion(cobro.numeroOperacion || '')
        setCobroNumDocumentos(cobro.numeroDocumentos?.toString() || '')
        setCobroDias(cobro.diasFinanciamiento?.toString() || '')
        setCobroDetraccionPct(cobro.detraccionPct?.toString() || '12')
        setCobroDetraccionMonto(cobro.detraccionMonto?.toString() || '')
        setCobroExcedentePct(cobro.excedentePct?.toString() || '1')
        setCobroExcedenteMonto(cobro.excedenteMonto?.toString() || '')
        setCobroValorAFinanciar(cobro.valorAFinanciar?.toString() || '')
        setCobroInteres(cobro.interesMonto?.toString() || '')
        setCobroComision(cobro.comisionEstructuracion?.toString() || '')
        setCobroGastos(cobro.gastosAdicionales?.toString() || '')
        setCobroIgvGastos(cobro.igvGastos?.toString() || '')
        setCobroAdelantoBanpro(cobro.adelantoBanpro?.toString() || '')
        setCobroConfirmacion(cobro.confirmacionCliente || '')
        setCobroFechaVencPago(cobro.fechaVencimientoPago ? cobro.fechaVencimientoPago.split('T')[0] : '')
        setCobroObs(cobro.observaciones || '')
      }
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  // ── Liquidación factoring (calculada en tiempo real) ──────────────────────
  const liq = useMemo(() => {
    const base      = cxc?.monto ?? 0
    const detPctV   = n(cobroDetraccionPct)
    const detMonto  = n(cobroDetraccionMonto) || (base * detPctV / 100)
    const valorNeto = base - detMonto
    const excPctV   = n(cobroExcedentePct)
    const excMonto  = n(cobroExcedenteMonto) || (valorNeto * excPctV / 100)
    const aFinanciar = n(cobroValorAFinanciar) || (valorNeto - excMonto)
    const interes   = n(cobroInteres)
    const comision  = n(cobroComision)
    const gastos    = n(cobroGastos)
    const igv       = n(cobroIgvGastos)
    const totalCostos = interes + comision + gastos + igv
    const aDesembolsar = aFinanciar - totalCostos
    const adelanto  = n(cobroAdelantoBanpro)
    const saldo     = aDesembolsar - adelanto
    const tasa      = n(cobroTasa)
    const dias      = parseInt(cobroDias) || 0
    const refInteres = tasa > 0 && dias > 0 ? aFinanciar * (tasa / 100 / 30) * dias : 0
    return { base, detMonto, valorNeto, excMonto, aFinanciar, totalCostos, aDesembolsar, saldo, refInteres }
  }, [cxc, cobroDetraccionPct, cobroDetraccionMonto, cobroExcedentePct, cobroExcedenteMonto,
      cobroValorAFinanciar, cobroInteres, cobroComision, cobroGastos, cobroIgvGastos,
      cobroAdelantoBanpro, cobroTasa, cobroDias])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePago = async () => {
    if (!cxc || !pagoMonto || !pagoFecha) { toast.error('Monto y fecha son requeridos'); return }
    const monto = parseFloat(pagoMonto)
    if (isNaN(monto) || monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (monto > cxc.saldoPendiente) {
      toast.error(`El monto excede el saldo (${formatCurrency(cxc.saldoPendiente, cxc.moneda)})`); return
    }
    setSavingPago(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${cxc.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto, fechaPago: pagoFecha, medioPago: pagoMedio,
          numeroOperacion: pagoOperacion || null,
          cuentaBancariaId: pagoBancoId === 'none' ? null : pagoBancoId,
          observaciones: pagoObs || null,
          conDetraccion,
          detraccionPorcentaje: conDetraccion ? parseFloat(detPct) : undefined,
          detraccionCodigo: conDetraccion ? detCodigo || undefined : undefined,
          detraccionFechaPago: conDetraccion ? detFecha || undefined : undefined,
          cuentaBNId: conDetraccion && detBancoId !== 'none' ? detBancoId : undefined,
          numeroConstanciaBN: conDetraccion && detConstancia ? detConstancia : undefined,
          conRetencion,
          retencionPorcentaje: conRetencion ? parseFloat(retPct) : undefined,
          retencionFecha: conRetencion ? retFecha || undefined : undefined,
          retencionNumeroConstancia: conRetencion ? retConstancia || undefined : undefined,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success('Pago registrado')
      setShowPagoForm(false)
      setPagoMonto(''); setPagoOperacion(''); setPagoObs('')
      setConDetraccion(false); setConRetencion(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar pago')
    } finally {
      setSavingPago(false)
    }
  }

  const handleSaveCobro = async () => {
    if (!cxc?.valorizacion) return
    setSavingCobro(true)
    try {
      const body: Record<string, any> = { tipo: cobroTipo }
      if (cobroTipo === 'factoring') {
        body.financiera          = cobroFinanciera || null
        body.tasaDescuentoPct    = cobroTasa ? parseFloat(cobroTasa) : null
        body.fechaDesembolso     = cobroFechaDesembolso || null
        body.fechaVencimiento    = cobroFechaVencimiento || null
        body.numeroOperacion     = cobroNumeroOperacion || null
        body.numeroDocumentos    = cobroNumDocumentos ? parseInt(cobroNumDocumentos) : null
        body.diasFinanciamiento  = cobroDias ? parseInt(cobroDias) : null
        body.detraccionPct       = cobroDetraccionPct ? parseFloat(cobroDetraccionPct) : null
        body.detraccionMonto     = liq.detMonto
        body.excedentePct        = cobroExcedentePct ? parseFloat(cobroExcedentePct) : null
        body.excedenteMonto      = liq.excMonto
        body.valorAFinanciar     = liq.aFinanciar
        body.interesMonto        = cobroInteres ? parseFloat(cobroInteres) : null
        body.comisionEstructuracion = cobroComision ? parseFloat(cobroComision) : null
        body.gastosAdicionales   = cobroGastos ? parseFloat(cobroGastos) : null
        body.igvGastos           = cobroIgvGastos ? parseFloat(cobroIgvGastos) : null
        body.montoADesembolsar   = liq.aDesembolsar
        body.adelantoBanpro      = cobroAdelantoBanpro ? parseFloat(cobroAdelantoBanpro) : null
        body.saldoAGirar         = liq.saldo
        body.montoDescontado     = liq.totalCostos
        body.montoNeto           = liq.aDesembolsar
      } else {
        body.confirmacionCliente = cobroConfirmacion || null
        body.fechaVencimientoPago = cobroFechaVencPago || null
        body.observaciones       = cobroObs || null
      }
      const res = await fetch(
        `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success('Cobro guardado')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar cobro')
    } finally {
      setSavingCobro(false)
    }
  }

  const handleAddAbono = async () => {
    if (!cxc?.valorizacion || !abonoMonto || !abonoFecha) return
    setSavingAbono(true)
    try {
      const res = await fetch(
        `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro/abonos`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monto: parseFloat(abonoMonto), fecha: abonoFecha, observaciones: abonoObs || null }) }
      )
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success('Abono registrado')
      setAbonoMonto(''); setAbonoObs(''); setShowAbonoForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar abono')
    } finally {
      setSavingAbono(false)
    }
  }

  const handleDeleteAbono = async (abonoId: string) => {
    if (!cxc?.valorizacion) return
    if (!window.confirm('¿Eliminar este abono?')) return
    try {
      const res = await fetch(
        `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro/abonos?abonoId=${abonoId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Error')
      toast.success('Abono eliminado')
      load()
    } catch {
      toast.error('Error al eliminar abono')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!cxc) return null

  const cobro = cxc.valorizacion?.cobro ?? null
  const tieneFactoring = !!cxc.valorizacionId

  const pagosCobro = cxc.pagos.filter(p => !p.esDetraccion && !p.esRetencion)
  const pagosDetraccion = cxc.pagos.filter(p => p.esDetraccion)
  const pagosRetencion  = cxc.pagos.filter(p => p.esRetencion)

  const labelRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value ?? '—'}</span>
    </div>
  )

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/administracion/cuentas-cobrar')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{cxc.numeroDocumento || 'Sin número'}</h1>
            <p className="text-muted-foreground">{cxc.cliente.nombre} · {cxc.proyecto.codigo}</p>
          </div>
        </div>
        <Badge className={`${ESTADO_COLORS[cxc.estado] ?? 'bg-gray-100 text-gray-700'} text-sm px-3 py-1`}>
          {cxc.estado.charAt(0).toUpperCase() + cxc.estado.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna izquierda: Datos + Montos ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos de la Factura */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-muted-foreground" /> Datos de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {labelRow('N° Documento', cxc.numeroDocumento)}
              {labelRow('Cliente', cxc.cliente.nombre)}
              {labelRow('RUC', cxc.cliente.ruc)}
              {labelRow('Proyecto', `${cxc.proyecto.codigo} — ${cxc.proyecto.nombre}`)}
              {labelRow('Valorización',
                cxc.valorizacion
                  ? <Link href={`/gestion/valorizaciones/${cxc.valorizacion.id}`}
                      className="text-blue-600 hover:underline flex items-center gap-1" target="_blank">
                      {cxc.valorizacion.codigo} <ExternalLink className="h-3 w-3" />
                    </Link>
                  : null
              )}
              {labelRow('OC Cliente', cxc.ordenCompraCliente)}
              {labelRow('N° HES', cxc.numeroHES)}
              {labelRow('N° Guía Remisión', cxc.numeroGuiaRemision)}
              {labelRow('Descripción', cxc.descripcion)}
              {labelRow('Fecha Emisión', cxc.fechaEmision ? formatDate(cxc.fechaEmision) : null)}
              {labelRow('Fecha Recepción', cxc.fechaRecepcion ? formatDate(cxc.fechaRecepcion) : null)}
              {labelRow('Fecha Vencimiento',
                <span className={cxc.estado === 'vencida' ? 'text-red-600 font-semibold' : ''}>
                  {formatDate(cxc.fechaVencimiento)}
                </span>
              )}
              {labelRow('Días Crédito', cxc.diasCredito != null ? `${cxc.diasCredito} días` : null)}
              {labelRow('Condición Pago', cxc.condicionPago)}
              {labelRow('Tipo Cambio', cxc.tipoCambio != null ? cxc.tipoCambio.toFixed(3) : null)}
              {labelRow('N° Negociación', cxc.numeroNegociacion)}
              {cxc.observaciones && labelRow('Observaciones', cxc.observaciones)}
            </CardContent>
          </Card>

          {/* Historial de Pagos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" /> Historial de Pagos
                </CardTitle>
                {cxc.estado !== 'pagada' && cxc.estado !== 'anulada' && (
                  <Button size="sm" onClick={() => setShowPagoForm(v => !v)}>
                    <Plus className="h-4 w-4 mr-1" /> Registrar Pago
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Formulario de pago */}
              {showPagoForm && (
                <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                  <p className="text-sm font-semibold">Nuevo Pago</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Monto ({cxc.moneda})</Label>
                      <Input type="number" step="0.01" placeholder="0.00"
                        value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fecha de Pago</Label>
                      <Input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)} />
                    </div>
                    <div>
                      <Label>Medio de Pago</Label>
                      <Select value={pagoMedio} onValueChange={setPagoMedio}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEDIO_PAGO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>N° Operación</Label>
                      <Input placeholder="Op-00123" value={pagoOperacion} onChange={e => setPagoOperacion(e.target.value)} />
                    </div>
                    <div>
                      <Label>Cuenta Bancaria</Label>
                      <Select value={pagoBancoId} onValueChange={setPagoBancoId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Sin cuenta —</SelectItem>
                          {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nombreBanco} {b.numeroCuenta}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Observaciones</Label>
                      <Input placeholder="Opcional" value={pagoObs} onChange={e => setPagoObs(e.target.value)} />
                    </div>
                  </div>

                  {/* Detracción */}
                  <div className="flex items-center gap-2">
                    <Checkbox id="det" checked={conDetraccion} onCheckedChange={v => {
                      setConDetraccion(!!v)
                      if (!!v && detBancoId === 'none') {
                        const bn = bancos.find(b => b.nombreBanco.toLowerCase().includes('nacion') || b.nombreBanco.toLowerCase().includes('nación'))
                        if (bn) setDetBancoId(bn.id)
                      }
                    }} />
                    <Label htmlFor="det" className="cursor-pointer">Incluye Detracción</Label>
                  </div>
                  {conDetraccion && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div><Label>% Detracción</Label><Input type="number" value={detPct} onChange={e => setDetPct(e.target.value)} /></div>
                      <div><Label>Código</Label><Input placeholder="011" value={detCodigo} onChange={e => setDetCodigo(e.target.value)} /></div>
                      <div><Label>Fecha Depósito</Label><Input type="date" value={detFecha} onChange={e => setDetFecha(e.target.value)} /></div>
                      <div><Label>Nro. Constancia BN</Label><Input value={detConstancia} onChange={e => setDetConstancia(e.target.value)} /></div>
                      <div className="col-span-2">
                        <Label>Cuenta BN</Label>
                        <Select value={detBancoId} onValueChange={setDetBancoId}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin cuenta —</SelectItem>
                            {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nombreBanco} {b.numeroCuenta}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Retención */}
                  <div className="flex items-center gap-2">
                    <Checkbox id="ret" checked={conRetencion} onCheckedChange={v => setConRetencion(!!v)} />
                    <Label htmlFor="ret" className="cursor-pointer">Incluye Retención</Label>
                  </div>
                  {conRetencion && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div><Label>% Retención</Label><Input type="number" value={retPct} onChange={e => setRetPct(e.target.value)} /></div>
                      <div><Label>Fecha</Label><Input type="date" value={retFecha} onChange={e => setRetFecha(e.target.value)} /></div>
                      <div className="col-span-2"><Label>Nro. Constancia</Label><Input value={retConstancia} onChange={e => setRetConstancia(e.target.value)} /></div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowPagoForm(false)}>Cancelar</Button>
                    <Button onClick={handlePago} disabled={savingPago}>
                      {savingPago ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Guardar Pago
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de pagos */}
              {cxc.pagos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Medio</TableHead>
                      <TableHead>N° Operación</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cxc.pagos.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.fechaPago)}</TableCell>
                        <TableCell>
                          {p.esDetraccion ? <Badge variant="outline" className="text-orange-600 border-orange-300">Detracción {p.detraccionPorcentaje}%</Badge>
                          : p.esRetencion ? <Badge variant="outline" className="text-purple-600 border-purple-300">Retención {p.retencionPorcentaje}%</Badge>
                          : <Badge variant="outline" className="text-green-700 border-green-300">Cobro</Badge>}
                        </TableCell>
                        <TableCell className="capitalize">{p.medioPago}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.numeroOperacion || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.monto, cxc.moneda)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Factoring / Cobro con Financiera */}
          {tieneFactoring && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Factoring / Cobro con Financiera
                    {cobro && <Badge variant="outline" className="text-xs">{cobro.tipo === 'factoring' ? 'Factoring' : 'Directo'}</Badge>}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowCobroForm(v => !v)}>
                    {showCobroForm ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {cobro ? 'Editar' : 'Registrar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Resumen cobro existente */}
                {cobro && !showCobroForm && (
                  <div className="space-y-0">
                    {cobro.tipo === 'factoring' ? <>
                      {labelRow('Financiera', cobro.financiera)}
                      {labelRow('Tasa', cobro.tasaDescuentoPct != null ? `${cobro.tasaDescuentoPct}%` : null)}
                      {labelRow('Fecha Desembolso', cobro.fechaDesembolso ? formatDate(cobro.fechaDesembolso) : null)}
                      {labelRow('N° Operación', cobro.numeroOperacion)}
                      {labelRow('Monto a Desembolsar', cobro.montoADesembolsar != null ? formatCurrency(cobro.montoADesembolsar, cxc.moneda) : null)}
                      {labelRow('Adelanto Banpro', cobro.adelantoBanpro != null ? formatCurrency(cobro.adelantoBanpro, cxc.moneda) : null)}
                      {labelRow('Saldo a Girar', cobro.saldoAGirar != null ? formatCurrency(cobro.saldoAGirar, cxc.moneda) : null)}
                    </> : <>
                      {labelRow('Confirmación Cliente', cobro.confirmacionCliente)}
                      {labelRow('Fecha Venc. Pago', cobro.fechaVencimientoPago ? formatDate(cobro.fechaVencimientoPago) : null)}
                      {labelRow('Observaciones', cobro.observaciones)}
                    </>}
                  </div>
                )}

                {/* Formulario cobro */}
                {showCobroForm && (
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={cobroTipo} onValueChange={v => setCobroTipo(v as 'factoring' | 'directo')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="factoring">Factoring (con financiera)</SelectItem>
                          <SelectItem value="directo">Directo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {cobroTipo === 'factoring' ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Financiera</Label><Input placeholder="Ej: Banpro, BCP..." value={cobroFinanciera} onChange={e => setCobroFinanciera(e.target.value)} /></div>
                          <div><Label>Tasa (%)</Label><Input type="number" step="0.01" placeholder="1.38" value={cobroTasa} onChange={e => setCobroTasa(e.target.value)} /></div>
                          <div><Label>Fecha Desembolso</Label><Input type="date" value={cobroFechaDesembolso} onChange={e => setCobroFechaDesembolso(e.target.value)} /></div>
                          <div><Label>Fecha Vencimiento</Label><Input type="date" value={cobroFechaVencimiento} onChange={e => setCobroFechaVencimiento(e.target.value)} /></div>
                          <div><Label>N° Operación</Label><Input value={cobroNumeroOperacion} onChange={e => setCobroNumeroOperacion(e.target.value)} /></div>
                          <div><Label>N° Documentos</Label><Input type="number" value={cobroNumDocumentos} onChange={e => setCobroNumDocumentos(e.target.value)} /></div>
                          <div><Label>Días Financiamiento</Label><Input type="number" value={cobroDias} onChange={e => setCobroDias(e.target.value)} /></div>
                        </div>

                        {/* Hoja de liquidación */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-800 text-white text-xs px-3 py-2 font-semibold">Hoja de Liquidación</div>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b">
                                <td className="px-3 py-2 text-muted-foreground">Base (Monto Factura)</td>
                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(liq.base, cxc.moneda)}</td>
                                <td className="px-3 py-2 w-40"></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Detracción</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(liq.detMonto, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Input className="h-7 text-xs w-16" type="number" placeholder="%" value={cobroDetraccionPct} onChange={e => setCobroDetraccionPct(e.target.value)} />
                                    <Input className="h-7 text-xs" type="number" placeholder="Monto" value={cobroDetraccionMonto} onChange={e => setCobroDetraccionMonto(e.target.value)} />
                                  </div>
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="px-3 py-2 text-muted-foreground">Valor Neto</td>
                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(liq.valorNeto, cxc.moneda)}</td>
                                <td></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Excedente</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(liq.excMonto, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Input className="h-7 text-xs w-16" type="number" placeholder="%" value={cobroExcedentePct} onChange={e => setCobroExcedentePct(e.target.value)} />
                                    <Input className="h-7 text-xs" type="number" placeholder="Monto" value={cobroExcedenteMonto} onChange={e => setCobroExcedenteMonto(e.target.value)} />
                                  </div>
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="px-3 py-2 text-muted-foreground">Valor a Financiar</td>
                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(liq.aFinanciar, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <Input className="h-7 text-xs" type="number" placeholder="Manual" value={cobroValorAFinanciar} onChange={e => setCobroValorAFinanciar(e.target.value)} />
                                </td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Interés</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroInteres), cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <Input className="h-7 text-xs" type="number" placeholder="0.00" value={cobroInteres} onChange={e => setCobroInteres(e.target.value)} />
                                  {liq.refInteres > 0 && <p className="text-xs text-muted-foreground mt-0.5">Ref: {formatCurrency(liq.refInteres, cxc.moneda)}</p>}
                                </td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Comisión</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroComision), cxc.moneda)}</td>
                                <td className="px-3 py-2"><Input className="h-7 text-xs" type="number" placeholder="0.00" value={cobroComision} onChange={e => setCobroComision(e.target.value)} /></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Gastos</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroGastos), cxc.moneda)}</td>
                                <td className="px-3 py-2"><Input className="h-7 text-xs" type="number" placeholder="0.00" value={cobroGastos} onChange={e => setCobroGastos(e.target.value)} /></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">IGV Gastos</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroIgvGastos), cxc.moneda)}</td>
                                <td className="px-3 py-2"><Input className="h-7 text-xs" type="number" placeholder="0.00" value={cobroIgvGastos} onChange={e => setCobroIgvGastos(e.target.value)} /></td>
                              </tr>
                              <tr className="border-b font-semibold">
                                <td className="px-3 py-2">Monto a Desembolsar</td>
                                <td className="px-3 py-2 text-right text-green-700">{formatCurrency(liq.aDesembolsar, cxc.moneda)}</td>
                                <td></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Adelanto Banpro</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroAdelantoBanpro), cxc.moneda)}</td>
                                <td className="px-3 py-2"><Input className="h-7 text-xs" type="number" placeholder="0.00" value={cobroAdelantoBanpro} onChange={e => setCobroAdelantoBanpro(e.target.value)} /></td>
                              </tr>
                              <tr className="font-bold text-base">
                                <td className="px-3 py-2">Saldo a Girar</td>
                                <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(liq.saldo, cxc.moneda)}</td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Confirmación Cliente</Label>
                          <Select value={cobroConfirmacion} onValueChange={setCobroConfirmacion}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="confirmado">Confirmado</SelectItem>
                              <SelectItem value="en_disputa">En disputa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Fecha Venc. Pago</Label>
                          <Input type="date" value={cobroFechaVencPago} onChange={e => setCobroFechaVencPago(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <Label>Observaciones</Label>
                          <Textarea value={cobroObs} onChange={e => setCobroObs(e.target.value)} rows={2} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowCobroForm(false)}>Cancelar</Button>
                      <Button onClick={handleSaveCobro} disabled={savingCobro}>
                        {savingCobro ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Guardar Cobro
                      </Button>
                    </div>
                  </div>
                )}

                {/* Abonos de la financiera */}
                {cobro && cobro.tipo === 'factoring' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Abonos de Financiera</p>
                      <Button variant="outline" size="sm" onClick={() => setShowAbonoForm(v => !v)}>
                        <Plus className="h-3 w-3 mr-1" /> Abono
                      </Button>
                    </div>

                    {showAbonoForm && (
                      <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Monto ({cxc.moneda})</Label><Input type="number" step="0.01" value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)} /></div>
                          <div><Label>Fecha</Label><Input type="date" value={abonoFecha} onChange={e => setAbonoFecha(e.target.value)} /></div>
                          <div className="col-span-2"><Label>Observaciones</Label><Input placeholder="Opcional" value={abonoObs} onChange={e => setAbonoObs(e.target.value)} /></div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setShowAbonoForm(false)}>Cancelar</Button>
                          <Button size="sm" onClick={handleAddAbono} disabled={savingAbono}>
                            {savingAbono ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Registrar
                          </Button>
                        </div>
                      </div>
                    )}

                    {cobro.abonos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin abonos registrados</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Observaciones</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cobro.abonos.map(a => (
                            <TableRow key={a.id}>
                              <TableCell>{formatDate(a.fecha)}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{a.observaciones || '—'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(a.monto, cxc.moneda)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="text-red-500 h-7 w-7 p-0"
                                  onClick={() => handleDeleteAbono(a.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Columna derecha: Montos ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">{formatCurrency(cxc.monto, cxc.moneda)}</p>
                <p className="text-xs text-muted-foreground">{cxc.moneda}</p>
              </div>
              <div className="space-y-0">
                {labelRow('Pagado', <span className="text-green-700">{formatCurrency(cxc.montoPagado, cxc.moneda)}</span>)}
                {labelRow('Saldo', <span className={cxc.saldoPendiente > 0 ? 'text-red-600 font-semibold' : 'text-green-700'}>{formatCurrency(cxc.saldoPendiente, cxc.moneda)}</span>)}
              </div>
              {cxc.tipoCambio && (
                <div className="text-xs text-muted-foreground text-center pt-1 border-t">
                  TC: {cxc.tipoCambio.toFixed(3)} · {formatCurrency(cxc.monto * cxc.tipoCambio, 'PEN')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalle por tipo de pago */}
          {cxc.pagos.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {pagosCobro.length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Cobros</p>
                    {pagosCobro.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>{formatDate(p.fechaPago)}</span>
                        <span className="font-medium">{formatCurrency(p.monto, cxc.moneda)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pagosDetraccion.length > 0 && (
                  <div className="text-sm border-t pt-2">
                    <p className="text-xs font-semibold text-orange-600 mb-1">Detracciones</p>
                    {pagosDetraccion.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>{formatDate(p.fechaPago)} · {p.detraccionPorcentaje}%</span>
                        <span className="font-medium">{formatCurrency(p.monto, cxc.moneda)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pagosRetencion.length > 0 && (
                  <div className="text-sm border-t pt-2">
                    <p className="text-xs font-semibold text-purple-600 mb-1">Retenciones</p>
                    {pagosRetencion.map(p => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span>{formatDate(p.fechaPago)} · {p.retencionPorcentaje}%</span>
                        <span className="font-medium">{formatCurrency(p.monto, cxc.moneda)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
