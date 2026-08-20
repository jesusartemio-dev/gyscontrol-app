'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, LineChart, AlertTriangle, ArrowRight, Info, Clock3, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getClientes } from '@/lib/services/cliente'
import type { Cliente } from '@/types/modelos'
import type { SituacionFinanciera, SituacionFinancieraMoneda } from '@/lib/administracion/situacionFinanciera'
import type { PisoPlanilla } from '@/lib/administracion/pisoPlanilla'
import { getMonedaSymbol } from '@/lib/utils/currency'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function fmt(n: number, moneda: string) {
  const simbolo = getMonedaSymbol(moneda)
  return `${simbolo} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDias(n: number | null) {
  return n == null ? '—' : `${n.toFixed(0)} días`
}

export default function SituacionFinancieraPage() {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [anio, setAnio] = useState(String(now.getFullYear()))
  const [clienteId, setClienteId] = useState('all')
  const [moneda, setMoneda] = useState('all')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [data, setData] = useState<SituacionFinanciera | null>(null)
  const [loading, setLoading] = useState(false)
  const [piso, setPiso] = useState<PisoPlanilla | null>(null)

  useEffect(() => {
    getClientes().then(setClientes).catch(() => {})
    // Snapshot de hoy, no depende del rango/cliente/moneda seleccionados —
    // mismo criterio que DSO/DPO (trailing fijo, no el filtro de arriba).
    fetch('/api/administracion/piso-planilla')
      .then(res => res.ok ? res.json() : null)
      .then(setPiso)
      .catch(() => {})
  }, [])

  const { desde, hasta } = useMemo(() => {
    const y = Number(anio)
    const m = Number(mes)
    const d = new Date(Date.UTC(y, m - 1, 1))
    const h = new Date(Date.UTC(y, m, 1))
    return { desde: d.toISOString().split('T')[0], hasta: h.toISOString().split('T')[0] }
  }, [mes, anio])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ desde, hasta })
        if (clienteId !== 'all') params.set('clienteId', clienteId)
        if (moneda !== 'all') params.set('moneda', moneda)
        const res = await fetch(`/api/administracion/situacion-financiera?${params}`)
        if (!res.ok) throw new Error('Error al cargar')
        setData(await res.json())
      } catch {
        toast.error('Error al cargar la situación financiera')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [desde, hasta, clienteId, moneda])

  const anios = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i))

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LineChart className="h-6 w-6 text-rose-600" />
          <div>
            <h1 className="text-xl font-semibold">Situación Financiera</h1>
            <p className="text-sm text-muted-foreground">Cartera CxC/CxP consolidada — empresa, no por proyecto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anios.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={moneda} onValueChange={setMoneda}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Moneda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="PEN">Solo PEN</SelectItem>
              <SelectItem value="USD">Solo USD</SelectItem>
              <SelectItem value="EUR">Solo EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barra de advertencia — siempre visible, antes de cualquier número */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          El piso de planilla de abajo es <strong>parcial</strong> (falta sueldo de varios empleados activos) y este
          tablero <strong>todavía no incluye</strong> gastos fijos (alquiler, contabilidad, etc.) ni el saldo bancario
          real — no reemplaza una revisión de caja. Ver detalle al pie.
        </AlertDescription>
      </Alert>

      <PisoPlanillaCard piso={piso} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          {data.porMoneda.map(m => <BloqueMoneda key={m.moneda} m={m} />)}
        </div>
      ) : null}

      {/* Próximamente — con el porqué, no solo el hueco */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700">
            🚧 Próximamente en este tablero
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <div className="flex gap-2">
            <span className="font-medium shrink-0">Gastos fijos:</span>
            <span>alquiler, contabilidad, servicios, etc. todavía no están en el sistema. Sin esto (y con el piso de
              planilla aún parcial), este tablero muestra el movimiento de la cartera, pero <strong>no</strong> si el
              mes fue rentable — eso requiere restar el piso fijo completo, que hoy se revisa aparte.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium shrink-0">Saldo bancario real:</span>
            <span>el sistema registra qué cuentas bancarias existen, pero no su saldo. La caja real de hoy
              se verifica directo en el banco — este tablero no la reemplaza.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PisoPlanillaCard({ piso }: { piso: PisoPlanilla | null }) {
  if (!piso) return null
  const incompleto = piso.empleadosSinSueldo > 0
  return (
    <Card className={incompleto ? 'border-amber-200' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Piso de Planilla
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold font-mono">{fmt(piso.totalMensual, 'PEN')}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
        <p className={`text-xs mt-1 ${incompleto ? 'text-amber-700' : 'text-muted-foreground'}`}>
          Calculado sobre {piso.empleadosConSueldo} de {piso.empleadosActivos} empleados activos
          {incompleto && ` — ${piso.empleadosSinSueldo} sin sueldo cargado, excluidos del total`}.
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2">
          Incluye EsSalud, gratificación, CTS, SCTR, Vida Ley y EMO según el régimen laboral de cada empleado (Mype o
          general) — no es solo el sueldo base. No incluye provisión de vacaciones todavía.
        </p>
      </CardContent>
    </Card>
  )
}

function BloqueMoneda({ m }: { m: SituacionFinancieraMoneda }) {
  const sinActividadCxC =
    m.valorizado.acumulado === 0 && m.facturado.acumulado === 0 && m.cobradoReal.acumulado === 0 &&
    m.agingCxC.buckets.corriente + m.agingCxC.buckets.d0_30 + m.agingCxC.buckets.d31_60 +
      m.agingCxC.buckets.d61_90 + m.agingCxC.buckets.d90mas === 0

  const sinActividadCxP = m.cxp.debido === 0 && m.cxp.pagadoPeriodo === 0

  if (sinActividadCxC && sinActividadCxP) {
    return (
      <div>
        <Badge variant="outline" className="mb-2">{m.moneda}</Badge>
        <p className="text-sm text-muted-foreground italic">Sin actividad de CxC ni CxP en esta moneda en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Badge variant="outline" className="text-sm">{m.moneda}</Badge>

      {sinActividadCxC ? (
        <p className="text-xs text-muted-foreground italic pl-1">Sin actividad de CxC en {m.moneda}.</p>
      ) : (
        <>
          {/* Valorizado -> Facturado -> Cobrado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TarjetaFlujo titulo="Valorizado" acumulado={m.valorizado.acumulado} periodo={m.valorizado.periodo} moneda={m.moneda} color="text-slate-700" />
            <TarjetaFlujo titulo="Facturado" acumulado={m.facturado.acumulado} periodo={m.facturado.periodo} moneda={m.moneda} color="text-blue-700" flecha />
            <TarjetaFlujo titulo="Cobrado (real)" acumulado={m.cobradoReal.acumulado} periodo={m.cobradoReal.periodo} moneda={m.moneda} color="text-emerald-700" flecha />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-1.5 text-muted-foreground bg-slate-50 rounded-md p-2 border">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Brecha valorizado → facturado: <strong className="text-slate-700">{fmt(m.brechas.valorizadoAFacturado, m.moneda)}</strong>.
                Es avance ya reconocido por el cliente que aún no se emitió como factura (a la espera de HES u otro
                requisito) — normal en el ciclo, no dinero perdido.
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-muted-foreground bg-slate-50 rounded-md p-2 border">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Brecha facturado → cobrado: <strong className="text-slate-700">{fmt(m.brechas.facturadoACobrado, m.moneda)}</strong>.
                Son facturas emitidas todavía en camino de cobro (crédito directo o en proceso de factoring) — revisa
                el aging de abajo para saber cuánto de esto es normal y cuánto ya está vencido.
              </span>
            </div>
          </div>

          {/* DSO vs DPO + Costo de financiamiento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">DSO vs DPO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <BarraDias label="DSO (cobro, trailing 365d)" dias={m.dso} otro={m.dpo} colorClass="bg-blue-500" />
                <BarraDias label="DPO (pago, trailing 365d)" dias={m.dpo} otro={m.dso} colorClass="bg-orange-500" />
                <LecturaDsoDpo dso={m.dso} dpo={m.dpo} />
                <p className="text-[11px] text-muted-foreground pt-1 border-t">
                  DSO/DPO usan siempre los últimos 365 días como base de cálculo (no cambian con el filtro de mes de
                  arriba) — con una facturación tan dispareja mes a mes, un solo mes como base hace que el número
                  salte sin que la cartera realmente haya cambiado.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Costo de Financiamiento (del período)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interés + comisión (factoring)</span>
                  <span className="font-mono font-medium">{fmt(m.costoFinanciamiento.interesComision, m.moneda)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ajuste por mora del cliente</span>
                  <span className="font-mono font-medium text-red-600">{fmt(m.costoFinanciamiento.ajusteMora, m.moneda)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="font-mono">{fmt(m.costoFinanciamiento.total, m.moneda)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Lo que cuesta financiarse vía factoring en este período — separado en 2 categorías porque tienen
                  causas distintas: el interés/comisión lo cobra la financiera siempre; el ajuste por mora solo
                  aparece cuando un cliente paga tarde y eso recorta lo que finalmente llega.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aging CxC */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aging de Cuentas por Cobrar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <BucketCard label="Corriente" valor={m.agingCxC.buckets.corriente} moneda={m.moneda} />
                <BucketCard label="0-30d" valor={m.agingCxC.buckets.d0_30} moneda={m.moneda} tono="amber" />
                <BucketCard label="31-60d" valor={m.agingCxC.buckets.d31_60} moneda={m.moneda} tono="orange" />
                <BucketCard label="61-90d" valor={m.agingCxC.buckets.d61_90} moneda={m.moneda} tono="red" />
                <BucketCard label="+90d" valor={m.agingCxC.buckets.d90mas} moneda={m.moneda} tono="red-fuerte" />
              </div>

              {m.agingCxC.porCliente.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Corriente</TableHead>
                        <TableHead className="text-right">0-30d</TableHead>
                        <TableHead className="text-right">31-60d</TableHead>
                        <TableHead className="text-right">61-90d</TableHead>
                        <TableHead className="text-right bg-red-50">+90d</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.agingCxC.porCliente.map(c => (
                        <TableRow key={c.clienteId}>
                          <TableCell className="text-sm font-medium">{c.clienteNombre}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{c.corriente > 0 ? fmt(c.corriente, m.moneda) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">{c.d0_30 > 0 ? fmt(c.d0_30, m.moneda) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-orange-600">{c.d31_60 > 0 ? fmt(c.d31_60, m.moneda) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-red-500">{c.d61_90 > 0 ? fmt(c.d61_90, m.moneda) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold text-red-700 bg-red-50">{c.d90mas > 0 ? fmt(c.d90mas, m.moneda) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(c.total, m.moneda)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-[11px] text-muted-foreground pt-2">
                    Ordenado por el monto en +90d — es el bucket donde está el mayor riesgo de cobranza, no
                    necesariamente coincide con quién debe más en total.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* CxP */}
      {!sinActividadCxP && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Debido (hoy)</p>
                <p className="text-lg font-semibold font-mono">{fmt(m.cxp.debido, m.moneda)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagado (período)</p>
                <p className="text-lg font-semibold font-mono">{fmt(m.cxp.pagadoPeriodo, m.moneda)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DPO (trailing 365d)</p>
                <p className="text-lg font-semibold font-mono">{fmtDias(m.dpo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TarjetaFlujo({ titulo, acumulado, periodo, moneda, color, flecha }: {
  titulo: string; acumulado: number; periodo: number; moneda: string; color: string; flecha?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {flecha && <ArrowRight className="h-3 w-3" />}
          {titulo} (acumulado)
        </div>
        <p className={`text-xl font-bold font-mono ${color}`}>{fmt(acumulado, moneda)}</p>
        <p className="text-xs text-muted-foreground mt-1">Este período: <span className="font-mono">{fmt(periodo, moneda)}</span></p>
      </CardContent>
    </Card>
  )
}

function BarraDias({ label, dias, otro, colorClass }: { label: string; dias: number | null; otro: number | null; colorClass: string }) {
  const escala = Math.max(dias ?? 0, otro ?? 0, 60)
  const valor = dias == null ? 0 : Math.min(100, (dias / escala) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{fmtDias(dias)}</span>
      </div>
      <Progress value={valor} className="h-2" indicatorClassName={colorClass} />
    </div>
  )
}

function LecturaDsoDpo({ dso, dpo }: { dso: number | null; dpo: number | null }) {
  if (dso == null || dpo == null) {
    return (
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-slate-50 rounded-md p-2 border">
        <Clock3 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Sin suficiente facturación o compras en los últimos 365 días para calcular ambos indicadores todavía.</span>
      </div>
    )
  }
  const diff = Math.round(dso - dpo)
  const lectura = diff > 5
    ? `Estamos financiando ${diff} días de operación con capital propio (cobramos más lento de lo que pagamos) — cuanto más alto, más capital de trabajo propio necesita el ciclo.`
    : diff < -5
      ? `Pagamos ${Math.abs(diff)} días más lento de lo que cobramos — el ciclo se financia solo, a favor de la caja.`
      : `DSO y DPO están cerca — el ciclo de cobro y pago está aproximadamente equilibrado.`
  return (
    <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-slate-50 rounded-md p-2 border">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{lectura}</span>
    </div>
  )
}

function BucketCard({ label, valor, moneda, tono }: { label: string; valor: number; moneda: string; tono?: 'amber' | 'orange' | 'red' | 'red-fuerte' }) {
  const estilos: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    red: 'border-red-200 bg-red-50 text-red-600',
    'red-fuerte': 'border-red-400 bg-red-100 text-red-800',
  }
  const clase = tono ? estilos[tono] : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <div className={`rounded-lg border p-2.5 ${clase}`}>
      <p className="text-[11px] font-medium">{label}</p>
      <p className={`font-mono font-bold ${tono === 'red-fuerte' ? 'text-base' : 'text-sm'}`}>{fmt(valor, moneda)}</p>
    </div>
  )
}
