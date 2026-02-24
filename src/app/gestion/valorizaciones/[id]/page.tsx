'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, Eye, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import TablaPartidas from '@/components/valorizacion/TablaPartidas'
import DetalleHH from '@/components/valorizacion/DetalleHH'
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
            </>
          )}
        </CardContent>
      </Card>

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
