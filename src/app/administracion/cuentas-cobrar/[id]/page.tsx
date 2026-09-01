'use client'

import { tieneRol } from '@/lib/auth/roles'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, ArrowLeft, Pencil, Save, Plus, Trash2, ExternalLink, DollarSign, Building2, ChevronDown, ChevronUp, Ban, AlertTriangle, HelpCircle, RotateCcw, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ESTADO_COBRO_FACTORING_LABEL, TIPO_EVENTO_FACTORING_LABEL } from '@/lib/utils/factoringEstado'
import { calcularFechaEstimadaPagoDesde } from '@/lib/utils/cuentasCobrarExcel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AbonoValorizacion {
  id: string
  cobroId: string
  tipo: 'adelanto' | 'saldo_girar' | 'detraccion' | 'excedente' | 'neto' | null
  estado: 'pendiente' | 'recibido'
  montoEsperado: number | null
  montoReal: number | null
  fechaEsperada: string | null
  fechaReal: string | null
  pagoCobroId: string | null
  observaciones: string | null
  createdAt: string
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
  retencionPct: number | null
  retencionMonto: number | null
  retencionNumeroComprobante: string | null
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
  montoNetoDirecto: number | null
  confirmacionCliente: string | null
  fechaVencimientoPago: string | null
  observaciones: string | null
  estado: string
  fechaConfirmacion: string | null
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
  esCostoFinanciamiento: boolean
  esAjusteMora: boolean
  anulado: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
  abonoValorizacion: { id: string } | null
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
  cliente: { id: string; nombre: string; ruc: string | null; diasPagoProgramados?: number[] | null }
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
const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * Señal de "lleva pendiente" para un cobro esperado. El excedente compara
 * contra su fecha esperada (= fechaVencimiento de la operación); saldo_girar
 * y detracción, sin fecha esperada real, comparan contra cuánto hace que
 * quedaron pendientes (createdAt), con umbrales según lo que Administración
 * describió (saldo a girar: 2-10 días; detracción: ~fin de mes) — ajustables.
 */
function senalAbono(abono: AbonoValorizacion): { texto: string; clase: string } | null {
  if (abono.estado === 'recibido') return null
  const hoy = new Date()
  if (abono.tipo === 'excedente' && abono.fechaEsperada) {
    const dias = Math.round((new Date(abono.fechaEsperada).getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) return { texto: `vencido hace ${Math.abs(dias)}d`, clase: 'text-red-600 font-medium' }
    if (dias <= 7) return { texto: `vence en ${dias}d`, clase: 'text-amber-600 font-medium' }
    return { texto: `vence en ${dias}d`, clase: 'text-muted-foreground' }
  }
  const diasPendiente = Math.round((hoy.getTime() - new Date(abono.createdAt).getTime()) / 86400000)
  const umbralAmbar = abono.tipo === 'saldo_girar' ? 10 : 35
  const umbralRojo = abono.tipo === 'saldo_girar' ? 20 : 45
  const clase = diasPendiente > umbralRojo ? 'text-red-600 font-medium' : diasPendiente > umbralAmbar ? 'text-amber-600 font-medium' : 'text-muted-foreground'
  return { texto: `hace ${diasPendiente}d`, clase }
}

// Orden fijo del Cronograma de Cobro — NO ordenar por fechaReal: los eventos
// 'pendiente' no tienen fechaReal (null), y Postgres no da un orden estable
// entre nulls, así que las filas pendientes se reacomodaban solas cada vez
// que algo cambiaba (ej. al revertir un evento).
const ORDEN_TIPO_EVENTO: Record<string, number> = { adelanto: 0, neto: 0, saldo_girar: 1, detraccion: 2, excedente: 3 }

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
  const { data: session } = useSession()
  const userRole = session?.user?.role || ''

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

  // ── Editar datos ─────────────────────────────────────────────────────────
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    numeroDocumento: '', descripcion: '', fechaEmision: '', fechaRecepcion: '',
    diasCredito: '', tipoCambio: '', ordenCompraCliente: '', numeroHES: '',
    numeroGuiaRemision: '', bancoFinanciera: '', numeroNegociacion: '', observaciones: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Anular / Eliminar ────────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<'anular' | 'eliminar' | null>(null)
  const [savingAction, setSavingAction] = useState(false)

  // ── Cobro / Factoring ────────────────────────────────────────────────────
  const [showCobroForm, setShowCobroForm]   = useState(false)
  const [cobroTipo, setCobroTipo]           = useState<'factoring' | 'directo'>('factoring')
  const [cobroFinanciera, setCobroFinanciera]           = useState('')
  const [cobroTasa, setCobroTasa]                       = useState('')
  const [cobroFechaDesembolso, setCobroFechaDesembolso] = useState('')
  const [cobroFechaVencimiento, setCobroFechaVencimiento] = useState('')
  // true mientras Fecha Vencimiento siga siendo la sugerencia calculada
  // (Fecha Desembolso + Días Financiamiento) sin que el usuario la haya
  // tocado a mano — mismo patrón que interesEsSugerido.
  const [fechaVencimientoEsSugerida, setFechaVencimientoEsSugerida] = useState(false)
  const [cobroNumeroOperacion, setCobroNumeroOperacion] = useState('')
  const [cobroNumDocumentos, setCobroNumDocumentos]     = useState('')
  const [cobroDias, setCobroDias]                       = useState('')
  const [cobroDetraccionPct, setCobroDetraccionPct]     = useState('12')
  const [cobroDetraccionMonto, setCobroDetraccionMonto] = useState('')
  // Retención — aplica a factoring y a cobro directo por igual: se conoce de
  // inmediato (viene impresa en la factura), se descuenta junto con la
  // Detracción antes de calcular el resto. Nunca es un evento pendiente.
  const [cobroRetencionPct, setCobroRetencionPct]       = useState('')
  const [cobroRetencionMonto, setCobroRetencionMonto]   = useState('')
  const [cobroRetencionComprobante, setCobroRetencionComprobante] = useState('')
  const [cobroExcedentePct, setCobroExcedentePct]       = useState('1')
  const [cobroExcedenteMonto, setCobroExcedenteMonto]   = useState('')
  const [cobroValorAFinanciar, setCobroValorAFinanciar] = useState('')
  const [cobroInteres, setCobroInteres]                 = useState('')
  // true mientras el valor de Interés siga siendo la sugerencia calculada
  // (tasa × valorAFinanciar × días/30) sin que el usuario la haya tocado a
  // mano — se apaga en cuanto el usuario escribe algo en el campo.
  const [interesEsSugerido, setInteresEsSugerido]       = useState(false)
  const [cobroComision, setCobroComision]               = useState('')
  const [cobroGastos, setCobroGastos]                   = useState('')
  const [cobroIgvGastos, setCobroIgvGastos]             = useState('')
  const [cobroAdelantoBanpro, setCobroAdelantoBanpro]   = useState('')
  // Cobro directo — mini liquidación (Neto/Detracción/Retención), mismo
  // Cronograma de Cobro que factoring pero sin Adelanto/Saldo a Girar/
  // Excedente (mecánica exclusiva de la financiera).
  const [cobroMontoNetoDirecto, setCobroMontoNetoDirecto] = useState('')
  const [cobroCuentaBancariaIdDirecto, setCobroCuentaBancariaIdDirecto] = useState('none')
  const [cobroConfirmacion, setCobroConfirmacion]       = useState('')
  const [cobroFechaVencPago, setCobroFechaVencPago]     = useState('')
  const [cobroObs, setCobroObs]                         = useState('')
  const [savingCobro, setSavingCobro]                   = useState(false)

  // Marcar un "cobro esperado" (saldo_girar / detraccion / excedente) como
  // recibido. Un solo diálogo genérico para los 3 — "Cliente pagó factura" es
  // solo el disparador visualmente distinto para el evento excedente (el
  // deudor le paga la factura a la financiera, que libera el 1% retenido),
  // pero por dentro abre este mismo diálogo y llama el mismo endpoint.
  const [abonoRecibiendo, setAbonoRecibiendo] = useState<AbonoValorizacion | null>(null)
  const [montoRecibir, setMontoRecibir]       = useState('')
  const [fechaRecibir, setFechaRecibir]       = useState(new Date().toISOString().split('T')[0])
  const [obsRecibir, setObsRecibir]           = useState('')
  // Solo aplica cuando el evento es 'detraccion' — mismo campo que ya usa el
  // cobro directo (PagoCobro.numeroConstanciaBN), antes no se pedía acá y
  // todo caía genérico en observaciones.
  const [constanciaRecibir, setConstanciaRecibir] = useState('')
  const [savingRecibir, setSavingRecibir]     = useState(false)

  // Revertir (Sub-fase E) — Caso 1 (desembolso completo, nada recibido
  // todavía) o Caso 2 (un evento puntual ya recibido). Mismo diálogo pesado
  // para los dos, distinto contenido según revertirTarget.tipo.
  const [revertirTarget, setRevertirTarget] = useState<
    { tipo: 'abono'; abono: AbonoValorizacion } | { tipo: 'desembolso' } | null
  >(null)
  const [motivoRevertir, setMotivoRevertir] = useState('')
  const [savingRevertir, setSavingRevertir] = useState(false)

  // Anular un PagoCobro individual (cobro, detracción o retención) registrado
  // por error — mismo patrón de "anular con rastro" que revertirTarget arriba,
  // pero para la tabla plana de Historial de Pagos (no factoring).
  const [pagoAnulando, setPagoAnulando] = useState<PagoCobro | null>(null)
  const [motivoAnularPago, setMotivoAnularPago] = useState('')
  const [savingAnularPago, setSavingAnularPago] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  // silent=true evita el spinner de pantalla completa (loading) — se usa al
  // refrescar después de una acción (pago, marcar recibido, revertir, etc.),
  // donde ya hay datos en pantalla y no tiene sentido desmontar toda la
  // página; solo el mount inicial pasa por el spinner.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
      // Populate edit form
      setEditForm({
        numeroDocumento: data.numeroDocumento ?? '',
        descripcion: data.descripcion ?? '',
        fechaEmision: data.fechaEmision ? data.fechaEmision.split('T')[0] : '',
        fechaRecepcion: data.fechaRecepcion ? data.fechaRecepcion.split('T')[0] : '',
        diasCredito: data.diasCredito != null ? String(data.diasCredito) : '',
        tipoCambio: data.tipoCambio != null ? String(data.tipoCambio) : '',
        ordenCompraCliente: data.ordenCompraCliente ?? '',
        numeroHES: data.numeroHES ?? '',
        numeroGuiaRemision: data.numeroGuiaRemision ?? '',
        bancoFinanciera: data.bancoFinanciera ?? '',
        numeroNegociacion: data.numeroNegociacion ?? '',
        observaciones: data.observaciones ?? '',
      })
      // Populate cobro form if exists
      const cobro = data.valorizacion?.cobro
      if (cobro) {
        setCobroTipo((cobro.tipo as 'factoring' | 'directo') || 'factoring')
        setCobroFinanciera(cobro.financiera || '')
        setCobroTasa(cobro.tasaDescuentoPct?.toString() || '')
        setCobroFechaDesembolso(cobro.fechaDesembolso ? cobro.fechaDesembolso.split('T')[0] : '')
        setCobroFechaVencimiento(cobro.fechaVencimiento ? cobro.fechaVencimiento.split('T')[0] : '')
        setFechaVencimientoEsSugerida(false)
        setCobroNumeroOperacion(cobro.numeroOperacion || '')
        setCobroNumDocumentos(cobro.numeroDocumentos?.toString() || '')
        setCobroDias(cobro.diasFinanciamiento?.toString() || '')
        setCobroDetraccionPct(cobro.detraccionPct?.toString() || '12')
        setCobroDetraccionMonto(cobro.detraccionMonto?.toString() || '')
        setCobroRetencionPct(cobro.retencionPct?.toString() || '')
        setCobroRetencionMonto(cobro.retencionMonto?.toString() || '')
        setCobroRetencionComprobante(cobro.retencionNumeroComprobante || '')
        setCobroExcedentePct(cobro.excedentePct?.toString() || '1')
        setCobroExcedenteMonto(cobro.excedenteMonto?.toString() || '')
        setCobroValorAFinanciar(cobro.valorAFinanciar?.toString() || '')
        setCobroInteres(cobro.interesMonto?.toString() || '')
        setInteresEsSugerido(false)
        setCobroComision(cobro.comisionEstructuracion?.toString() || '')
        setCobroGastos(cobro.gastosAdicionales?.toString() || '')
        setCobroIgvGastos(cobro.igvGastos?.toString() || '')
        setCobroAdelantoBanpro(cobro.adelantoBanpro?.toString() || '')
        setCobroMontoNetoDirecto(cobro.montoNetoDirecto?.toString() || '')
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
    const retPctV   = n(cobroRetencionPct)
    const retMonto  = n(cobroRetencionMonto) || (base * retPctV / 100)
    const valorNeto = base - detMonto - retMonto
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
    const refInteresDisponible = tasa > 0 && dias > 0 && aFinanciar > 0
    return { base, detMonto, retMonto, valorNeto, excMonto, aFinanciar, totalCostos, aDesembolsar, saldo, refInteres, refInteresDisponible }
  }, [cxc, cobroDetraccionPct, cobroDetraccionMonto, cobroRetencionPct, cobroRetencionMonto, cobroExcedentePct, cobroExcedenteMonto,
      cobroValorAFinanciar, cobroInteres, cobroComision, cobroGastos, cobroIgvGastos,
      cobroAdelantoBanpro, cobroTasa, cobroDias])

  // ── Mini liquidación cobro directo (Neto = Base − Detracción − Retención) ──
  const liqDirecto = useMemo(() => {
    const base     = cxc?.monto ?? 0
    const detPctV  = n(cobroDetraccionPct)
    const detMonto = n(cobroDetraccionMonto) || (base * detPctV / 100)
    const retPctV  = n(cobroRetencionPct)
    const retMonto = n(cobroRetencionMonto) || (base * retPctV / 100)
    const neto     = base - detMonto - retMonto
    return { base, detMonto, retMonto, neto }
  }, [cxc, cobroDetraccionPct, cobroDetraccionMonto, cobroRetencionPct, cobroRetencionMonto])

  // Sugerencia de Interés: tasa × valorAFinanciar × (días/30). Solo se aplica
  // mientras el campo esté vacío o siga marcado como "sugerido" — nunca pisa
  // un valor que el usuario ya escribió a mano (ver onChange del input).
  useEffect(() => {
    if (!liq.refInteresDisponible) return
    if (cobroInteres !== '' && !interesEsSugerido) return
    const sugerido = liq.refInteres.toFixed(2)
    if (sugerido !== cobroInteres) setCobroInteres(sugerido)
    if (!interesEsSugerido) setInteresEsSugerido(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liq.refInteres, liq.refInteresDisponible])

  // Sugerencia de Fecha Vencimiento = Fecha Desembolso + Días Financiamiento.
  // A diferencia del Interés (que solo se sugiere si el campo está vacío),
  // acá SÍ recalcula y pisa el valor cada vez que el usuario edita Desembolso
  // o Días — son 2 datos mecánicamente ligados (fecha base + plazo), no una
  // cifra que la financiera pueda dar distinta. Deliberadamente NO es un
  // useEffect: si dependiera de cobroFechaDesembolso/cobroDias, se
  // recalcularía también cuando load() puebla el formulario al abrir un
  // cobro ya guardado, pisando silenciosamente una Fecha Vencimiento real
  // que no siga la fórmula exacta (ej. ajustada a día hábil). Se dispara
  // solo desde el onChange de esos 2 campos — una edición real del usuario.
  const recalcularFechaVencimientoSugerida = (fechaDesembolso: string, diasStr: string) => {
    const dias = parseInt(diasStr) || 0
    if (!fechaDesembolso || dias <= 0) return
    const base = new Date(fechaDesembolso + 'T00:00:00')
    base.setDate(base.getDate() + dias)
    setCobroFechaVencimiento(base.toISOString().split('T')[0])
    setFechaVencimientoEsSugerida(true)
  }

  // Llenar la hoja de liquidación con valores de ejemplo, editables antes de
  // guardar — para pruebas rápidas (o como punto de partida de Administración
  // mientras espera los datos reales de la financiera). Interés usa la
  // fórmula real ya verificada; Comisión, Gastos, IGV Gastos y Adelanto NO
  // tienen ninguna fórmula comprobada — son solo porcentajes de ejemplo
  // razonables, nunca se presentan como un dato confirmado.
  const handleLlenarEjemplo = () => {
    const base = cxc?.monto ?? 0
    const detPctV = n(cobroDetraccionPct)
    const detMonto = n(cobroDetraccionMonto) || (base * detPctV / 100)
    const valorNeto = base - detMonto
    const excPctV = n(cobroExcedentePct)
    const excMonto = n(cobroExcedenteMonto) || (valorNeto * excPctV / 100)
    const aFinanciar = n(cobroValorAFinanciar) || (valorNeto - excMonto)

    const tasa = n(cobroTasa)
    const dias = parseInt(cobroDias) || 0
    const interes = tasa > 0 && dias > 0 ? round2(aFinanciar * (tasa / 100 / 30) * dias) : 0
    const comision = round2(aFinanciar * 0.01)   // 1% de ejemplo
    const gastos = round2(aFinanciar * 0.005)    // 0.5% de ejemplo
    const igv = round2(gastos * 0.18)            // 18% IGV Perú sobre los gastos
    const totalCostos = interes + comision + gastos + igv
    const aDesembolsar = aFinanciar - totalCostos
    const adelanto = round2(aDesembolsar * 0.95) // 95% de ejemplo, el resto queda como saldo a girar

    setCobroInteres(interes.toFixed(2))
    setInteresEsSugerido(true)
    setCobroComision(comision.toFixed(2))
    setCobroGastos(gastos.toFixed(2))
    setCobroIgvGastos(igv.toFixed(2))
    setCobroAdelantoBanpro(adelanto.toFixed(2))
  }

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
      load(true)
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
        body.retencionPct        = cobroRetencionPct ? parseFloat(cobroRetencionPct) : null
        body.retencionMonto      = liq.retMonto
        body.retencionNumeroComprobante = cobroRetencionComprobante || null
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
        body.fechaDesembolso     = cobroFechaDesembolso || null
        body.detraccionPct       = cobroDetraccionPct ? parseFloat(cobroDetraccionPct) : null
        body.detraccionMonto     = liqDirecto.detMonto
        body.retencionPct        = cobroRetencionPct ? parseFloat(cobroRetencionPct) : null
        body.retencionMonto      = liqDirecto.retMonto
        body.retencionNumeroComprobante = cobroRetencionComprobante || null
        body.montoNetoDirecto    = n(cobroMontoNetoDirecto) || liqDirecto.neto
        body.cuentaBancariaId    = cobroCuentaBancariaIdDirecto !== 'none' ? cobroCuentaBancariaIdDirecto : null
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
      load(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar cobro')
    } finally {
      setSavingCobro(false)
    }
  }

  const abrirRecibirDialog = (abono: AbonoValorizacion) => {
    setAbonoRecibiendo(abono)
    setMontoRecibir(abono.montoEsperado != null ? String(abono.montoEsperado) : '')
    setFechaRecibir(new Date().toISOString().split('T')[0])
    setObsRecibir('')
    setConstanciaRecibir('')
  }

  const handleMarcarRecibido = async () => {
    if (!cxc?.valorizacion || !abonoRecibiendo || !montoRecibir || !fechaRecibir) return
    setSavingRecibir(true)
    try {
      const res = await fetch(
        `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro/abonos/${abonoRecibiendo.id}/recibir`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            montoReal: parseFloat(montoRecibir), fechaReal: fechaRecibir, observaciones: obsRecibir || null,
            numeroConstanciaBN: abonoRecibiendo.tipo === 'detraccion' ? (constanciaRecibir || null) : undefined,
          }) }
      )
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success(abonoRecibiendo.tipo === 'excedente' ? 'Cliente pagó la factura — excedente liberado y aplicado a la CxC' : 'Cobro registrado')
      setAbonoRecibiendo(null)
      load(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar el cobro')
    } finally {
      setSavingRecibir(false)
    }
  }

  const abrirRevertirAbono = (abono: AbonoValorizacion) => {
    setRevertirTarget({ tipo: 'abono', abono })
    setMotivoRevertir('')
  }

  const abrirRevertirDesembolso = () => {
    setRevertirTarget({ tipo: 'desembolso' })
    setMotivoRevertir('')
  }

  const handleConfirmarRevertir = async () => {
    if (!cxc?.valorizacion || !revertirTarget || motivoRevertir.trim().length < 10) return
    setSavingRevertir(true)
    try {
      const url = revertirTarget.tipo === 'desembolso'
        ? `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro/revertir-desembolso`
        : `/api/proyectos/${cxc.valorizacion.proyectoId}/valorizaciones/${cxc.valorizacion.id}/cobro/abonos/${revertirTarget.abono.id}/revertir`
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoRevertir.trim() }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success(revertirTarget.tipo === 'desembolso' ? 'Desembolso revertido — corrige y vuelve a guardar' : 'Cobro revertido — el evento vuelve a pendiente')
      const eraDesembolso = revertirTarget.tipo === 'desembolso'
      setRevertirTarget(null)
      await load(true)
      // Reabre el formulario de liquidación precargado con los últimos datos
      // guardados — fechaDesembolso ya viene vacía desde el backend, así que
      // load() la recarga vacía sin que haya que limpiarla a mano acá.
      if (eraDesembolso) setShowCobroForm(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al revertir')
    } finally {
      setSavingRevertir(false)
    }
  }

  const abrirAnularPago = (pago: PagoCobro) => {
    setPagoAnulando(pago)
    setMotivoAnularPago('')
  }

  const handleConfirmarAnularPago = async () => {
    if (!cxc || !pagoAnulando || motivoAnularPago.trim().length < 10) return
    setSavingAnularPago(true)
    try {
      const res = await fetch(
        `/api/administracion/cuentas-cobrar/${cxc.id}/pagos/${pagoAnulando.id}/anular`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: motivoAnularPago.trim() }) }
      )
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success('Pago anulado — ya puedes registrar el correcto')
      setPagoAnulando(null)
      load(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al anular el pago')
    } finally {
      setSavingAnularPago(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!cxc) return
    const tipoCambio = editForm.tipoCambio ? parseFloat(editForm.tipoCambio) : null
    if (editForm.tipoCambio && (isNaN(tipoCambio!) || tipoCambio! <= 0)) { toast.error('Tipo de cambio inválido'); return }
    const diasCredito = editForm.diasCredito ? parseInt(editForm.diasCredito, 10) : null
    if (editForm.diasCredito && (isNaN(diasCredito!) || diasCredito! < 0)) { toast.error('Días de crédito inválidos'); return }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${cxc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroDocumento: editForm.numeroDocumento || null,
          descripcion: editForm.descripcion || null,
          fechaEmision: editForm.fechaEmision || null,
          fechaRecepcion: editForm.fechaRecepcion || null,
          diasCredito, tipoCambio,
          ordenCompraCliente: editForm.ordenCompraCliente || null,
          numeroHES: editForm.numeroHES || null,
          numeroGuiaRemision: editForm.numeroGuiaRemision || null,
          bancoFinanciera: editForm.bancoFinanciera || null,
          numeroNegociacion: editForm.numeroNegociacion || null,
          observaciones: editForm.observaciones || null,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error') }
      toast.success('CxC actualizada')
      setShowEditForm(false)
      load(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleAnular = async () => {
    if (!cxc) return
    setSavingAction(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${cxc.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'anulada' }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
      toast.success('CxC anulada')
      setConfirmAction(null)
      load(true)
    } catch (e: any) {
      toast.error(e.message || 'Error al anular')
    } finally {
      setSavingAction(false)
    }
  }

  const handleEliminar = async () => {
    if (!cxc) return
    setSavingAction(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${cxc.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Error') }
      toast.success('CxC eliminada')
      router.push('/administracion/cuentas-cobrar')
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
      setSavingAction(false)
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
  const abonoExcedentePendiente = cobro?.abonos.find(a => a.tipo === 'excedente' && a.estado === 'pendiente') ?? null

  // Cronograma de cobro (factoring y directo): orden entre eventos,
  // reflejando el guard del backend (marcarAbonoFactoringRecibido) para que
  // el botón ya aparezca deshabilitado en vez de que el usuario descubra el
  // bloqueo al hacer clic. 'neto' cumple el mismo rol que 'adelanto' —
  // el evento base de cobro directo, siempre recibido de inmediato.
  const adelantoRecibido = cobro?.abonos.some(a => (a.tipo === 'adelanto' || a.tipo === 'neto') && a.estado === 'recibido') ?? false
  const requiereRegularizacion = !!cobro && cobro.estado !== 'en_negociacion' && !adelantoRecibido
  const faltantesParaExcedente = (cobro?.abonos ?? []).filter(a => (a.tipo === 'saldo_girar' || a.tipo === 'detraccion') && a.estado === 'pendiente')

  const eventosRecibidos = cobro?.abonos.filter(a => a.estado === 'recibido') ?? []
  const eventosPendientes = cobro?.abonos.filter(a => a.estado === 'pendiente') ?? []
  const totalCobradoReal = eventosRecibidos.reduce((s, a) => s + (a.montoReal ?? 0), 0)
  const totalPendienteEsperado = eventosPendientes.reduce((s, a) => s + (a.montoEsperado ?? 0), 0)
  // anulado excluido — un pago revertido ya no cuenta, ni en el resumen ni en
  // las listas de abajo (queda visible tachado en el historial completo).
  const totalCostoFinanciamiento = cxc.pagos.filter(p => p.esCostoFinanciamiento && !p.anulado).reduce((s, p) => s + p.monto, 0)
  const totalAjusteMora = cxc.pagos.filter(p => p.esAjusteMora && !p.anulado).reduce((s, p) => s + p.monto, 0)

  const pagosCobro = cxc.pagos.filter(p => !p.esDetraccion && !p.esRetencion && !p.anulado)
  const pagosDetraccion = cxc.pagos.filter(p => p.esDetraccion && !p.anulado)
  const pagosRetencion  = cxc.pagos.filter(p => p.esRetencion && !p.anulado)
  const totalRetencion = pagosRetencion.reduce((s, p) => s + p.monto, 0)

  // Revertir (Sub-fase E): mismas 2 restricciones que ya valida el backend,
  // calculadas acá para que el ícono de revertir ni aparezca cuando no aplica.
  const puedeRevertirDesembolso = !!cobro && cobro.estado === 'desembolsada'
    && !cobro.abonos.some(a => a.tipo !== 'adelanto' && a.tipo !== 'neto' && a.estado === 'recibido')
  // El rol para excedente se oculta, no se deshabilita (ver DISENO_UI_REVERSION_FACTORING.md,
  // punto 3a) — restricción de rol, no de estado, el usuario no puede resolverla desde acá.
  const puedeRevertirExcedente = tieneRol(session, ['admin', 'gerente'])

  const labelRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value ?? '—'}</span>
    </div>
  )

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/administracion/cuentas-cobrar')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{cxc.numeroDocumento || 'Sin número'}</h1>
            <p className="text-muted-foreground">{cxc.cliente.nombre} · {cxc.proyecto.codigo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${ESTADO_COLORS[cxc.estado] ?? 'bg-gray-100 text-gray-700'} text-sm px-3 py-1`}>
            {cxc.estado.charAt(0).toUpperCase() + cxc.estado.slice(1)}
          </Badge>
          {cxc.estado !== 'anulada' && (
            <Button variant="outline" size="sm" onClick={() => setShowEditForm(v => !v)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
          {(cxc.estado === 'pendiente' || cxc.estado === 'parcial' || cxc.estado === 'vencida') && (
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => setShowPagoForm(v => !v)}>
                <Plus className="h-4 w-4 mr-1" /> Registrar Pago
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="¿Qué es Registrar Pago?">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Para cobro directo del cliente (transferencia, cheque, efectivo). Si esta factura va por factoring, no uses este botón — usa la tarjeta "Factoring / Cobro con Financiera" más abajo.
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {cxc.estado !== 'anulada' && (
            <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => setConfirmAction('anular')}>
              <Ban className="h-4 w-4 mr-1" /> Anular
            </Button>
          )}
          {(cxc.estado === 'anulada' || (cxc.montoPagado === 0 && cxc.estado !== 'pagada')) && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setConfirmAction('eliminar')}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
        </div>
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
              {labelRow('Fecha Vencimiento',
                <span className={cxc.estado === 'vencida' ? 'text-red-600 font-semibold' : ''}>
                  {formatDate(cxc.fechaVencimiento)}
                </span>
              )}
              {(() => {
                const diasPago = cxc.cliente.diasPagoProgramados
                const fechaEstimada = calcularFechaEstimadaPagoDesde(
                  cxc.fechaRecepcion, cxc.fechaEmision, cxc.diasCredito, diasPago
                )
                if (!fechaEstimada) return labelRow('Fecha Estimada de Pago', null)
                return labelRow('Fecha Estimada de Pago',
                  <div>
                    <div>{formatDate(fechaEstimada.toISOString())}</div>
                    <div className="text-[11px] font-normal text-muted-foreground">
                      {diasPago && diasPago.length > 0
                        ? `Recepción + ${cxc.diasCredito}d, redondeado a días de pago de ${cxc.cliente.nombre}: ${diasPago.join(', ')} (si cae fin de semana, pasa al siguiente día hábil)`
                        : `${cxc.fechaRecepcion ? 'Recepción' : 'Emisión'} + ${cxc.diasCredito} días de crédito`}
                    </div>
                  </div>
                )
              })()}
              {labelRow('Días Crédito', cxc.diasCredito != null ? `${cxc.diasCredito} días` : null)}
              {labelRow('Condición Pago', cxc.condicionPago)}
              {labelRow('Tipo Cambio', cxc.tipoCambio != null ? cxc.tipoCambio.toFixed(3) : null)}
              {labelRow('N° Negociación', cxc.numeroNegociacion)}
              {cxc.observaciones && labelRow('Observaciones', cxc.observaciones)}
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
                    {cobro && (
                      <Badge className={`text-xs ${
                        cobro.estado === 'confirmada' ? 'bg-green-100 text-green-700'
                        : cobro.estado === 'desembolsada' ? 'bg-blue-100 text-blue-700'
                        : cobro.estado === 'letra_cambio' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                        {ESTADO_COBRO_FACTORING_LABEL[cobro.estado] ?? cobro.estado}
                      </Badge>
                    )}
                    {puedeRevertirDesembolso && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Revertir desembolso"
                            onClick={abrirRevertirDesembolso}
                            className="text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">Revertir el desembolso — nada se ha recibido todavía</TooltipContent>
                      </Tooltip>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {cobro?.tipo === 'factoring' && cobro.estado === 'desembolsada' && abonoExcedentePendiente && (() => {
                      const bloqueado = requiereRegularizacion || faltantesParaExcedente.length > 0
                      const razon = requiereRegularizacion
                        ? 'Esta operación no tiene el adelanto registrado por el flujo actual — requiere regularización'
                        : faltantesParaExcedente.length > 0
                          ? `Faltan por recibir: ${faltantesParaExcedente.map(a => TIPO_EVENTO_FACTORING_LABEL[a.tipo ?? ''] ?? a.tipo).join(', ')}`
                          : ''
                      const boton = (
                        <Button size="sm" disabled={bloqueado} onClick={() => abrirRecibirDialog(abonoExcedentePendiente)}>
                          {bloqueado && <span className="mr-1">🔒</span>}
                          Cliente pagó factura
                        </Button>
                      )
                      if (!bloqueado) return boton
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild><span tabIndex={0}>{boton}</span></TooltipTrigger>
                          <TooltipContent className="max-w-64">{razon}</TooltipContent>
                        </Tooltip>
                      )
                    })()}
                    <Button variant="outline" size="sm" onClick={() => setShowCobroForm(v => !v)}>
                      {showCobroForm ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {cobro ? 'Editar' : 'Registrar'}
                    </Button>
                  </div>
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
                      {labelRow('Fecha Confirmación', cobro.fechaConfirmacion ? formatDate(cobro.fechaConfirmacion) : null)}
                    </> : <>
                      {labelRow('Fecha de Cobro', cobro.fechaDesembolso ? formatDate(cobro.fechaDesembolso) : null)}
                      {labelRow('Detracción', cobro.detraccionMonto != null ? formatCurrency(cobro.detraccionMonto, cxc.moneda) : null)}
                      {labelRow('Retención', cobro.retencionMonto != null ? formatCurrency(cobro.retencionMonto, cxc.moneda) : null)}
                      {labelRow('Neto Cobrado', cobro.montoNetoDirecto != null ? formatCurrency(cobro.montoNetoDirecto, cxc.moneda) : null)}
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
                          <div>
                            <Label>Fecha Desembolso</Label>
                            <Input
                              type="date"
                              value={cobroFechaDesembolso}
                              onChange={e => { setCobroFechaDesembolso(e.target.value); recalcularFechaVencimientoSugerida(e.target.value, cobroDias) }}
                            />
                          </div>
                          <div>
                            <Label>
                              Fecha Vencimiento
                              {fechaVencimientoEsSugerida && cobroFechaVencimiento !== '' && (
                                <span className="ml-1.5 text-[10px] font-normal text-gray-400 align-middle">(sugerido)</span>
                              )}
                            </Label>
                            <Input
                              type="date"
                              value={cobroFechaVencimiento}
                              onChange={e => { setCobroFechaVencimiento(e.target.value); setFechaVencimientoEsSugerida(false) }}
                            />
                          </div>
                          <div><Label>N° Operación</Label><Input value={cobroNumeroOperacion} onChange={e => setCobroNumeroOperacion(e.target.value)} /></div>
                          <div><Label>N° Documentos</Label><Input type="number" value={cobroNumDocumentos} onChange={e => setCobroNumDocumentos(e.target.value)} /></div>
                          <div>
                            <Label>Días Financiamiento</Label>
                            <Input
                              type="number"
                              value={cobroDias}
                              onChange={e => { setCobroDias(e.target.value); recalcularFechaVencimientoSugerida(cobroFechaDesembolso, e.target.value) }}
                            />
                          </div>
                        </div>

                        {/* Hoja de liquidación */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-800 text-white text-xs px-3 py-2 font-semibold flex items-center justify-between">
                            <span>Hoja de Liquidación</span>
                            <button
                              type="button"
                              onClick={handleLlenarEjemplo}
                              className="text-[11px] font-normal text-gray-300 hover:text-white underline underline-offset-2"
                              title="Llena Comisión, Gastos, IGV Gastos y Adelanto con valores de ejemplo (editables) — Interés usa la fórmula real"
                            >
                              Llenar valores de ejemplo
                            </button>
                          </div>
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
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Retención</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(liq.retMonto, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Input className="h-7 text-xs w-16" type="number" placeholder="%" value={cobroRetencionPct} onChange={e => setCobroRetencionPct(e.target.value)} />
                                    <Input className="h-7 text-xs" type="number" placeholder="Monto" value={cobroRetencionMonto} onChange={e => setCobroRetencionMonto(e.target.value)} />
                                  </div>
                                  {liq.retMonto > 0 && (
                                    <Input className="h-7 text-xs mt-1" placeholder="N° Comprobante" value={cobroRetencionComprobante} onChange={e => setCobroRetencionComprobante(e.target.value)} />
                                  )}
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
                                <td className="px-3 py-2 text-muted-foreground">
                                  Interés
                                  {interesEsSugerido && cobroInteres !== '' && (
                                    <span className="ml-1.5 text-[10px] font-normal text-gray-400 align-middle">(sugerido)</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(n(cobroInteres), cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    className="h-7 text-xs"
                                    type="number"
                                    placeholder="0.00"
                                    value={cobroInteres}
                                    onChange={e => { setCobroInteres(e.target.value); setInteresEsSugerido(false) }}
                                  />
                                  {liq.refInteresDisponible && !interesEsSugerido && Math.abs(n(cobroInteres) - liq.refInteres) > 0.01 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">Ref: {formatCurrency(liq.refInteres, cxc.moneda)}</p>
                                  )}
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
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Fecha de Cobro</Label>
                            <Input type="date" value={cobroFechaDesembolso} onChange={e => setCobroFechaDesembolso(e.target.value)} />
                          </div>
                          <div>
                            <Label>Cuenta Bancaria (Neto)</Label>
                            <Select value={cobroCuentaBancariaIdDirecto} onValueChange={setCobroCuentaBancariaIdDirecto}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin especificar</SelectItem>
                                {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nombreBanco} — {b.numeroCuenta}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Mini hoja de liquidación — Neto/Detracción/Retención, sin
                            Adelanto/Saldo a Girar/Excedente (mecánica exclusiva de factoring) */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-800 text-white text-xs px-3 py-2 font-semibold">Liquidación (Cobro Directo)</div>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b">
                                <td className="px-3 py-2 text-muted-foreground">Base (Monto Factura)</td>
                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(liqDirecto.base, cxc.moneda)}</td>
                                <td className="px-3 py-2 w-40"></td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Detracción</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(liqDirecto.detMonto, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Input className="h-7 text-xs w-16" type="number" placeholder="%" value={cobroDetraccionPct} onChange={e => setCobroDetraccionPct(e.target.value)} />
                                    <Input className="h-7 text-xs" type="number" placeholder="Monto" value={cobroDetraccionMonto} onChange={e => setCobroDetraccionMonto(e.target.value)} />
                                  </div>
                                </td>
                              </tr>
                              <tr className="border-b bg-gray-50">
                                <td className="px-3 py-2 text-muted-foreground">Retención</td>
                                <td className="px-3 py-2 text-right text-red-600">− {formatCurrency(liqDirecto.retMonto, cxc.moneda)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <Input className="h-7 text-xs w-16" type="number" placeholder="%" value={cobroRetencionPct} onChange={e => setCobroRetencionPct(e.target.value)} />
                                    <Input className="h-7 text-xs" type="number" placeholder="Monto" value={cobroRetencionMonto} onChange={e => setCobroRetencionMonto(e.target.value)} />
                                  </div>
                                  {liqDirecto.retMonto > 0 && (
                                    <Input className="h-7 text-xs mt-1" placeholder="N° Comprobante" value={cobroRetencionComprobante} onChange={e => setCobroRetencionComprobante(e.target.value)} />
                                  )}
                                </td>
                              </tr>
                              <tr className="font-bold text-base">
                                <td className="px-3 py-2">Neto a Cobrar</td>
                                <td className="px-3 py-2 text-right text-green-700">
                                  {formatCurrency(n(cobroMontoNetoDirecto) || liqDirecto.neto, cxc.moneda)}
                                </td>
                                <td className="px-3 py-2">
                                  <Input className="h-7 text-xs" type="number" placeholder={liqDirecto.neto.toFixed(2)} value={cobroMontoNetoDirecto} onChange={e => setCobroMontoNetoDirecto(e.target.value)} />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {cobro?.estado === 'desembolsada' && (
                          <p className="text-xs text-muted-foreground">
                            Ya registrado — la Detracción pendiente se marca recibida desde el Cronograma de Cobro más abajo.
                          </p>
                        )}

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
                      </>
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

                {/* Resumen de esta operación — el "entró X, falta Y, costó Z" */}
                {cobro && cobro.abonos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Cobrado (real)</p>
                      <p className="text-sm font-semibold text-green-700">{formatCurrency(totalCobradoReal, cxc.moneda)}</p>
                      <p className="text-[10px] text-muted-foreground">{eventosRecibidos.length} de {cobro.abonos.length} eventos</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Pendiente por cobrar</p>
                      <p className="text-sm font-semibold text-amber-700">{formatCurrency(totalPendienteEsperado, cxc.moneda)}</p>
                      <p className="text-[10px] text-muted-foreground">{eventosPendientes.length} evento{eventosPendientes.length === 1 ? '' : 's'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Costo de financiamiento</p>
                      <p className="text-sm font-semibold text-red-700">{formatCurrency(totalCostoFinanciamiento, cxc.moneda)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Ajuste por mora</p>
                      <p className="text-sm font-semibold text-red-700">{formatCurrency(totalAjusteMora, cxc.moneda)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Retención</p>
                      <p className="text-sm font-semibold text-red-700">{formatCurrency(totalRetencion, cxc.moneda)}</p>
                    </div>
                  </div>
                )}

                {/* Cronograma de Cobro — eventos de factoring o cobro directo */}
                {cobro && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Cronograma de Cobro</p>

                    {cobro.abonos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin eventos todavía — se crean al registrar el desembolso.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Evento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Esperado</TableHead>
                            <TableHead className="text-right">Real</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...cobro.abonos].sort((a, b) => (ORDEN_TIPO_EVENTO[a.tipo ?? ''] ?? 99) - (ORDEN_TIPO_EVENTO[b.tipo ?? ''] ?? 99)).map(a => {
                            const senal = senalAbono(a)
                            const esExcedente = a.tipo === 'excedente'
                            const bloqueado = requiereRegularizacion || !adelantoRecibido
                            const razon = requiereRegularizacion
                              ? 'Esta operación no tiene el adelanto registrado por el flujo actual — requiere regularización'
                              : !adelantoRecibido
                                ? 'No se puede recibir ningún evento antes que el adelanto'
                                : ''
                            // El adelanto no se revierte suelto (ver revertirAbonoFactoringRecibido) —
                            // solo se deshace completo con "Revertir desembolso" (ícono del header).
                            const puedeRevertirEsteEvento = (a.tipo === 'adelanto' || a.tipo === 'neto') ? false : esExcedente ? puedeRevertirExcedente : true
                            const fueRevertido = a.estado === 'pendiente' && (a.observaciones ?? '').includes('Revertido:')
                            const boton = a.estado === 'recibido' ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-xs text-green-700">✓</span>
                                {puedeRevertirEsteEvento && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        aria-label={`Revertir ${TIPO_EVENTO_FACTORING_LABEL[a.tipo ?? ''] ?? 'evento'}`}
                                        onClick={() => abrirRevertirAbono(a)}
                                        className="text-muted-foreground hover:text-red-600 transition-colors"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-64">Revertir este cobro</TooltipContent>
                                  </Tooltip>
                                )}
                              </span>
                            ) : esExcedente ? (
                              <span className="text-[11px] text-muted-foreground italic">usa &quot;Cliente pagó factura&quot; arriba</span>
                            ) : bloqueado ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button size="sm" variant="outline" disabled>🔒 Marcar recibido</Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64">{razon}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => abrirRecibirDialog(a)}>Marcar recibido</Button>
                            )
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="text-sm font-medium">{TIPO_EVENTO_FACTORING_LABEL[a.tipo ?? ''] ?? a.tipo ?? '—'}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center gap-1">
                                    <Badge variant="outline" className={a.estado === 'recibido' ? 'text-green-700 border-green-300' : 'text-amber-700 border-amber-300'}>
                                      {a.estado === 'recibido' ? 'Recibido' : 'Pendiente'}
                                    </Badge>
                                    {fueRevertido && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span tabIndex={0} className="text-muted-foreground">
                                            <Info className="h-3.5 w-3.5" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-72">{a.observaciones}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-sm">{a.montoEsperado != null ? formatCurrency(a.montoEsperado, cxc.moneda) : '—'}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {a.montoReal != null ? formatCurrency(a.montoReal, cxc.moneda) : '—'}
                                  {a.montoReal != null && a.montoEsperado != null && a.montoEsperado - a.montoReal > 0.01 && (
                                    <p className="text-[11px] text-red-600">−{formatCurrency(a.montoEsperado - a.montoReal, cxc.moneda)} mora</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {a.estado === 'recibido'
                                    ? (a.fechaReal ? formatDate(a.fechaReal) : '—')
                                    : (senal ? <span className={senal.clase}>{senal.texto}</span> : '—')}
                                </TableCell>
                                <TableCell className="text-right">{boton}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Historial de Pagos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" /> Historial de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

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
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cxc.pagos.map(p => (
                      <TableRow key={p.id} className={p.anulado ? 'opacity-60' : ''}>
                        <TableCell className={p.anulado ? 'line-through' : ''}>{formatDate(p.fechaPago)}</TableCell>
                        <TableCell>
                          <span className={p.anulado ? 'line-through' : ''}>
                            {p.esDetraccion ? <Badge variant="outline" className="text-orange-600 border-orange-300">Detracción {p.detraccionPorcentaje}%</Badge>
                            : p.esRetencion ? <Badge variant="outline" className="text-purple-600 border-purple-300">Retención {p.retencionPorcentaje}%</Badge>
                            : <Badge variant="outline" className="text-green-700 border-green-300">Cobro</Badge>}
                          </span>
                          {p.anulado && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0} className="ml-1.5 inline-flex align-middle text-red-500">
                                  <Ban className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-72">
                                Anulado{p.fechaAnulacion ? ` el ${formatDate(p.fechaAnulacion)}` : ''}: {p.motivoAnulacion}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className={`capitalize ${p.anulado ? 'line-through' : ''}`}>{p.medioPago}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.numeroOperacion || '—'}</TableCell>
                        <TableCell className={`text-right font-medium ${p.anulado ? 'line-through' : ''}`}>{formatCurrency(p.monto, cxc.moneda)}</TableCell>
                        <TableCell>
                          {!p.anulado && p.abonoValorizacion ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                                    <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-64">
                                Este pago pertenece a un evento del Cronograma de Cobro (factoring) — revierte desde el ícono ↺ de esa fila, no desde acá.
                              </TooltipContent>
                            </Tooltip>
                          ) : !p.anulado ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirAnularPago(p)}>
                                  <Ban className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Anular pago (se registró con error)</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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

      {/* ── Dialog Marcar recibido (genérico: saldo_girar / detraccion / excedente) ── */}
      <Dialog open={!!abonoRecibiendo} onOpenChange={open => { if (!open) setAbonoRecibiendo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {abonoRecibiendo?.tipo === 'excedente' ? 'Cliente pagó factura' : `Marcar "${TIPO_EVENTO_FACTORING_LABEL[abonoRecibiendo?.tipo ?? ''] ?? ''}" como recibido`}
            </DialogTitle>
            <DialogDescription>
              {abonoRecibiendo?.tipo === 'excedente'
                ? <>El cliente le pagó la factura a la financiera. Eso libera el excedente retenido (esperado: {abonoRecibiendo?.montoEsperado != null ? formatCurrency(abonoRecibiendo.montoEsperado, cxc.moneda) : '—'}) como cobro real y <strong>cierra la operación de factoring</strong>. Si llegó menos por mora, edita el monto.</>
                : <>Monto esperado: {abonoRecibiendo?.montoEsperado != null ? formatCurrency(abonoRecibiendo.montoEsperado, cxc.moneda) : '—'}. Si llegó menos, edita el monto — la diferencia se registra como ajuste, no se pierde.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto real recibido ({cxc.moneda}) *</Label>
              <Input type="number" step="0.01" value={montoRecibir} onChange={e => setMontoRecibir(e.target.value)} />
            </div>
            <div>
              <Label>Fecha real *</Label>
              <Input type="date" value={fechaRecibir} onChange={e => setFechaRecibir(e.target.value)} />
            </div>
            {abonoRecibiendo?.tipo === 'detraccion' && (
              <div>
                <Label>N° Constancia (Banco de la Nación)</Label>
                <Input value={constanciaRecibir} onChange={e => setConstanciaRecibir(e.target.value)} placeholder="Ej: 298887985" />
              </div>
            )}
            <div>
              <Label>Observaciones (opcional)</Label>
              <Input value={obsRecibir} onChange={e => setObsRecibir(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbonoRecibiendo(null)}>Cancelar</Button>
            <Button onClick={handleMarcarRecibido} disabled={savingRecibir}>
              {savingRecibir && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {abonoRecibiendo?.tipo === 'excedente' ? 'Cliente pagó factura' : 'Marcar recibido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Revertir (Sub-fase E) — Caso 1 (desembolso) / Caso 2 (evento) ──
           Deliberadamente más pesado que "Marcar recibido": ícono de advertencia,
           caja roja con lo que se anula, texto de consecuencias fijo, contador
           de caracteres del motivo, botón destructive. */}
      <Dialog open={!!revertirTarget} onOpenChange={open => { if (!open) setRevertirTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {revertirTarget?.tipo === 'desembolso'
                ? 'Revertir el desembolso'
                : `Revertir "${TIPO_EVENTO_FACTORING_LABEL[revertirTarget?.tipo === 'abono' ? revertirTarget.abono.tipo ?? '' : ''] ?? ''}" recibido`}
            </DialogTitle>
            <DialogDescription>Esta acción anula dinero ya registrado — no es parte del flujo normal.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-1">Esto va a anular:</p>
              {revertirTarget?.tipo === 'abono' ? (
                <p className="text-sm">
                  {TIPO_EVENTO_FACTORING_LABEL[revertirTarget.abono.tipo ?? ''] ?? revertirTarget.abono.tipo} ·{' '}
                  {revertirTarget.abono.montoReal != null ? formatCurrency(revertirTarget.abono.montoReal, cxc.moneda) : '—'} ·{' '}
                  recibido el {revertirTarget.abono.fechaReal ? formatDate(revertirTarget.abono.fechaReal) : '—'}
                </p>
              ) : revertirTarget?.tipo === 'desembolso' ? (
                <>
                  {(() => {
                    const abonoBase = cobro?.abonos.find(a => a.tipo === 'adelanto' || a.tipo === 'neto')
                    const pagoBase = abonoBase?.pagoCobroId ? cxc.pagos.find(p => p.id === abonoBase.pagoCobroId) : undefined
                    const pagoCosto = cxc.pagos.find(p => p.esCostoFinanciamiento && !p.anulado)
                    const pagoRetencion = cxc.pagos.find(p => p.esRetencion && !p.anulado)
                    return (
                      <>
                        {pagoBase && <p className="text-sm">{TIPO_EVENTO_FACTORING_LABEL[abonoBase?.tipo ?? ''] ?? 'Adelanto/Neto'} · {formatCurrency(pagoBase.monto, cxc.moneda)} · {formatDate(pagoBase.fechaPago)}</p>}
                        {pagoCosto && <p className="text-sm">Costo de financiamiento · {formatCurrency(pagoCosto.monto, cxc.moneda)} · {formatDate(pagoCosto.fechaPago)}</p>}
                        {pagoRetencion && <p className="text-sm">Retención · {formatCurrency(pagoRetencion.monto, cxc.moneda)} · {formatDate(pagoRetencion.fechaPago)}</p>}
                      </>
                    )
                  })()}
                </>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-amber-300 pl-3">
              {revertirTarget?.tipo === 'desembolso' ? (
                <p>El/los pago(s) se anulan (no se borran) y quedan en el historial marcados como anulados. Los eventos del cronograma se eliminan — ninguno se ha recibido todavía, así que no hay nada más que perder. La operación vuelve a &quot;En negociación&quot; y el formulario se reabre con tus datos, listo para corregir.</p>
              ) : (
                <>
                  <p>El pago se anula (no se borra) y queda en el historial marcado como anulado, con el motivo que escribas abajo. El evento vuelve a &quot;Pendiente&quot; con su monto teórico intacto para volver a registrarlo bien.</p>
                  {revertirTarget?.tipo === 'abono' && revertirTarget.abono.tipo === 'excedente' && (
                    <p>Además, esto revierte el cierre de la operación: vuelve a &quot;Desembolsada&quot; (ya no &quot;Confirmada&quot;), y si la Valorización había subido a &quot;Pagada&quot; por este cobro, vuelve a &quot;Facturada&quot;.</p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label>Motivo de la reversión * (mínimo 10 caracteres)</Label>
              <Textarea value={motivoRevertir} onChange={e => setMotivoRevertir(e.target.value)} rows={2} placeholder="Ej: se registró el monto de otra factura por error" />
              <p className={`text-xs mt-1 ${motivoRevertir.trim().length >= 10 ? 'text-muted-foreground' : 'text-red-600'}`}>
                {motivoRevertir.trim().length}/10 caracteres mínimos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertirTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarRevertir} disabled={savingRevertir || motivoRevertir.trim().length < 10}>
              {savingRevertir && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {revertirTarget?.tipo === 'desembolso' ? 'Revertir desembolso' : 'Revertir pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Anular Pago (fila de Historial de Pagos) ── */}
      <Dialog open={!!pagoAnulando} onOpenChange={open => { if (!open) setPagoAnulando(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Anular pago
            </DialogTitle>
            <DialogDescription>Esta acción anula un movimiento ya registrado — no es parte del flujo normal.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pagoAnulando && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 mb-1">Esto va a anular:</p>
                <p className="text-sm">
                  {pagoAnulando.esDetraccion ? `Detracción ${pagoAnulando.detraccionPorcentaje}%`
                    : pagoAnulando.esRetencion ? `Retención ${pagoAnulando.retencionPorcentaje}%`
                    : 'Cobro'}
                  {' · '}{formatCurrency(pagoAnulando.monto, cxc.moneda)}{' · '}
                  {formatDate(pagoAnulando.fechaPago)}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3">
              El pago se anula (no se borra) y queda en el historial marcado como anulado, con el motivo que escribas abajo. El saldo pendiente de la CxC se recalcula al instante — después registra el pago correcto.
            </p>

            <div>
              <Label>Motivo de la anulación * (mínimo 10 caracteres)</Label>
              <Textarea value={motivoAnularPago} onChange={e => setMotivoAnularPago(e.target.value)} rows={2} placeholder="Ej: se registró el monto neto en vez del bruto" />
              <p className={`text-xs mt-1 ${motivoAnularPago.trim().length >= 10 ? 'text-muted-foreground' : 'text-red-600'}`}>
                {motivoAnularPago.trim().length}/10 caracteres mínimos
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoAnulando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarAnularPago} disabled={savingAnularPago || motivoAnularPago.trim().length < 10}>
              {savingAnularPago && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Anular pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Registrar Pago ── */}
      <Dialog open={showPagoForm} onOpenChange={open => {
        if (!open) { setShowPagoForm(false); setConDetraccion(false); setConRetencion(false) }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {cxc.numeroDocumento} · Saldo: {formatCurrency(cxc.saldoPendiente, cxc.moneda)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <div className="col-span-2">
                <Label>Cuenta Bancaria</Label>
                <Select value={pagoBancoId} onValueChange={setPagoBancoId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sin cuenta —</SelectItem>
                    {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nombreBanco} · {b.numeroCuenta}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observaciones</Label>
                <Input placeholder="Opcional" value={pagoObs} onChange={e => setPagoObs(e.target.value)} />
              </div>
            </div>

            {/* Detracción */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="det-dlg" checked={conDetraccion} onCheckedChange={v => {
                  setConDetraccion(!!v)
                  if (!!v && detBancoId === 'none') {
                    const bn = bancos.find(b => b.nombreBanco.toLowerCase().includes('nacion') || b.nombreBanco.toLowerCase().includes('nación'))
                    if (bn) setDetBancoId(bn.id)
                  }
                }} />
                <Label htmlFor="det-dlg" className="cursor-pointer font-medium">¿Incluye Detracción?</Label>
              </div>
              {conDetraccion && (
                <div className="grid grid-cols-2 gap-3 pl-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div><Label className="text-xs">% Detracción</Label><Input type="number" value={detPct} onChange={e => setDetPct(e.target.value)} /></div>
                  <div><Label className="text-xs">Código SUNAT</Label><Input placeholder="011" value={detCodigo} onChange={e => setDetCodigo(e.target.value)} /></div>
                  <div><Label className="text-xs">Fecha Depósito BN</Label><Input type="date" value={detFecha} onChange={e => setDetFecha(e.target.value)} /></div>
                  <div><Label className="text-xs">N° Constancia BN</Label><Input value={detConstancia} onChange={e => setDetConstancia(e.target.value)} /></div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cuenta Banco de la Nación</Label>
                    <Select value={detBancoId} onValueChange={setDetBancoId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sin cuenta —</SelectItem>
                        {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nombreBanco} · {b.numeroCuenta}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Retención */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ret-dlg" checked={conRetencion} onCheckedChange={v => setConRetencion(!!v)} />
                <Label htmlFor="ret-dlg" className="cursor-pointer font-medium">¿Incluye Retención?</Label>
              </div>
              {conRetencion && (
                <div className="grid grid-cols-2 gap-3 pl-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div><Label className="text-xs">% Retención</Label><Input type="number" value={retPct} onChange={e => setRetPct(e.target.value)} /></div>
                  <div><Label className="text-xs">Fecha</Label><Input type="date" value={retFecha} onChange={e => setRetFecha(e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">N° Constancia</Label><Input value={retConstancia} onChange={e => setRetConstancia(e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagoForm(false)}>Cancelar</Button>
            <Button onClick={handlePago} disabled={savingPago}>
              {savingPago ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Editar ── */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Datos</DialogTitle>
            <DialogDescription>{cxc.numeroDocumento || 'Sin documento'} — {cxc.cliente.nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-muted/50 border rounded text-xs space-y-0.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Monto</span><span className="font-mono font-bold">{formatCurrency(cxc.monto, cxc.moneda)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vencimiento</span><span>{formatDate(cxc.fechaVencimiento)}</span></div>
              <p className="text-muted-foreground italic pt-1">Monto, moneda y vencimiento no son editables. Para cambiarlos, anula y crea una nueva.</p>
            </div>
            <div>
              <Label>N° Documento</Label>
              <Input placeholder="F001-00123" value={editForm.numeroDocumento} onChange={e => setEditForm(f => ({ ...f, numeroDocumento: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fecha Emisión</Label><Input type="date" value={editForm.fechaEmision} onChange={e => setEditForm(f => ({ ...f, fechaEmision: e.target.value }))} /></div>
              <div><Label>Fecha Recepción</Label><Input type="date" value={editForm.fechaRecepcion} onChange={e => setEditForm(f => ({ ...f, fechaRecepcion: e.target.value }))} /></div>
              <div><Label>Días Crédito</Label><Input type="number" placeholder="30" value={editForm.diasCredito} onChange={e => setEditForm(f => ({ ...f, diasCredito: e.target.value }))} /></div>
              <div><Label>Tipo Cambio</Label><Input type="number" step="0.001" placeholder="3.800" value={editForm.tipoCambio} onChange={e => setEditForm(f => ({ ...f, tipoCambio: e.target.value }))} /></div>
            </div>
            <div><Label>OC Cliente</Label><Input placeholder="8070008797" value={editForm.ordenCompraCliente} onChange={e => setEditForm(f => ({ ...f, ordenCompraCliente: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>N° HES</Label><Input placeholder="HES-1000123" value={editForm.numeroHES} onChange={e => setEditForm(f => ({ ...f, numeroHES: e.target.value }))} /></div>
              <div><Label>N° Guía Remisión</Label><Input placeholder="T001-12345" value={editForm.numeroGuiaRemision} onChange={e => setEditForm(f => ({ ...f, numeroGuiaRemision: e.target.value }))} /></div>
              <div><Label>Banco / Financiera</Label><Input placeholder="BANPRO..." value={editForm.bancoFinanciera} onChange={e => setEditForm(f => ({ ...f, bancoFinanciera: e.target.value }))} /></div>
              <div><Label>N° Negociación</Label><Input placeholder="12237" value={editForm.numeroNegociacion} onChange={e => setEditForm(f => ({ ...f, numeroNegociacion: e.target.value }))} /></div>
            </div>
            <div><Label>Descripción</Label><Input placeholder="Servicio eléctrico..." value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
            <div><Label>Observaciones</Label><Input placeholder="Notas adicionales" value={editForm.observaciones} onChange={e => setEditForm(f => ({ ...f, observaciones: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Anular / Eliminar ── */}
      <Dialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${confirmAction === 'eliminar' ? 'text-red-600' : 'text-amber-600'}`} />
              {confirmAction === 'anular' ? 'Anular CxC' : 'Eliminar CxC'}
            </DialogTitle>
            <DialogDescription>{cxc.numeroDocumento || 'Sin documento'} — {cxc.cliente.nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 border rounded space-y-1">
              <div className="flex justify-between"><span>Monto</span><span className="font-mono font-bold">{formatCurrency(cxc.monto, cxc.moneda)}</span></div>
              {cxc.montoPagado > 0 && <div className="flex justify-between text-green-600"><span>Pagado</span><span className="font-mono">{formatCurrency(cxc.montoPagado, cxc.moneda)}</span></div>}
            </div>
            {confirmAction === 'anular' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                <p className="font-medium">La cuenta pasará a estado &quot;Anulada&quot;.</p>
                <p className="text-xs mt-1">No se podrán registrar más cobros. Los pagos existentes se mantienen.</p>
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">
                <p className="font-medium">Esta acción es irreversible.</p>
                <p className="text-xs mt-1">Se eliminará la CxC y todos sus registros asociados.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
            <Button
              variant={confirmAction === 'eliminar' ? 'destructive' : 'default'}
              className={confirmAction === 'anular' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              onClick={confirmAction === 'anular' ? handleAnular : handleEliminar}
              disabled={savingAction}
            >
              {savingAction ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {confirmAction === 'anular' ? 'Anular' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
