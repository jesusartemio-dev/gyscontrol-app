'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Loader2, ArrowRight, Lock, ArrowDownCircle, ArrowUpCircle, Search, RefreshCw,
  Banknote, FileCheck, ShieldCheck,
} from 'lucide-react'
import { getHojasDeGastos } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function PendientesPage() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      // Solo lo necesario: estados que afectan KPIs y validadas para detalle de saldo
      const [aprobadas, rendidas, revisadas, validadas] = await Promise.all([
        getHojasDeGastos({ estado: 'aprobado' }),
        getHojasDeGastos({ estado: 'rendido' }),
        getHojasDeGastos({ estado: 'revisado' }),
        getHojasDeGastos({ estado: 'validado' }),
      ])
      setHojas([...aprobadas, ...rendidas, ...revisadas, ...validadas])
    } catch (e) {
      console.error('Error cargando hojas pendientes:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // Incluimos revisado + validado: ambas son post-revisión documental y comparten
  // el flujo de cierre. La diferencia es solo qué acción toca (validar / cerrar / movimiento).
  const enCierre = useMemo(() => {
    let arr = hojas.filter(h => h.estado === 'revisado' || h.estado === 'validado')
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      arr = arr.filter(h =>
        h.numero.toLowerCase().includes(q) ||
        (h.empleado?.name?.toLowerCase() ?? '').includes(q) ||
        (h.proyecto?.codigo?.toLowerCase() ?? '').includes(q) ||
        (h.proyecto?.nombre?.toLowerCase() ?? '').includes(q)
      )
    }
    return arr
  }, [hojas, busqueda])

  const conteos = useMemo(() => ({
    porDepositar: hojas.filter(h => h.estado === 'aprobado' && h.requiereAnticipo).length,
    porRevisar: hojas.filter(h => h.estado === 'rendido').length,
    porValidar: hojas.filter(h => h.estado === 'revisado').length,
  }), [hojas])

  const cuadradas = useMemo(() => enCierre.filter(h => Math.abs(h.saldo) <= 0.01), [enCierre])
  const debenDevolver = useMemo(
    () => enCierre.filter(h => h.saldo > 0.01).sort((a, b) => b.saldo - a.saldo),
    [enCierre]
  )
  const debenReembolsar = useMemo(
    () => enCierre.filter(h => h.saldo < -0.01).sort((a, b) => a.saldo - b.saldo),
    [enCierre]
  )

  const totalPorCobrar = debenDevolver.reduce((s, h) => s + h.saldo, 0)
  const totalPorPagar = debenReembolsar.reduce((s, h) => s + Math.abs(h.saldo), 0)

  const irADetalle = (id: string) => router.push(`/gastos/mis-requerimientos/${id}?from=pendientes`)
  const irAGastosTab = (tab: string) => router.push(`/administracion/gastos?tab=${tab}`)

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Pendientes</h1>
          <p className="text-xs text-muted-foreground">
            Resumen financiero y atajos a las etapas con trabajo pendiente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en validadas..."
              className="h-8 pl-7 text-xs w-56"
            />
          </div>
          <Button variant="outline" size="sm" onClick={cargar} disabled={loading} className="h-8">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <>
          {/* Atajos a otras etapas (no se duplican listas — solo conteo + link a /gastos) */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Otras etapas pendientes (gestionar en Gestión de Gastos)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-3 gap-2">
              <AtajoCard
                label="Por depositar"
                hint="admin registra el anticipo"
                count={conteos.porDepositar}
                icon={<Banknote className="h-4 w-4" />}
                color="purple"
                onClick={() => irAGastosTab('aprobado')}
              />
              <AtajoCard
                label="Por revisar"
                hint="admin verifica comprobantes"
                count={conteos.porRevisar}
                icon={<FileCheck className="h-4 w-4" />}
                color="orange"
                onClick={() => irAGastosTab('rendido')}
              />
              <AtajoCard
                label="Por validar"
                hint="coordinador da conformidad"
                count={conteos.porValidar}
                icon={<ShieldCheck className="h-4 w-4" />}
                color="cyan"
                onClick={() => irAGastosTab('revisado')}
              />
            </CardContent>
          </Card>

          {/* Sección principal: hojas post-revisión agrupadas por saldo */}
          <div className="border-t pt-4">
            <h2 className="text-base font-semibold mb-2">Hojas en cierre — agrupadas por saldo</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {enCierre.length === 0
                ? 'No hay hojas en proceso de cierre.'
                : `${enCierre.length} hoja(s) entre revisado y validado. La acción depende del estado.`}
            </p>

            {/* KPIs financieros */}
            {(totalPorCobrar > 0 || totalPorPagar > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Card className="border-blue-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50"><ArrowDownCircle className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Por cobrar (devoluciones de empleados)</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPorCobrar)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-200">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-50"><ArrowUpCircle className="h-5 w-5 text-amber-600" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Por pagar (reembolsos a empleados)</p>
                      <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPorPagar)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {enCierre.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No hay hojas en proceso de cierre. ✨
                </CardContent>
              </Card>
            ) : (
              <>
                <Seccion
                  titulo="Saldo S/ 0 — solo validar y cerrar"
                  subtitulo="Coordinador valida y admin cierra (sin movimientos de dinero)"
                  hojas={cuadradas}
                  color="emerald"
                  icon={<Lock className="h-4 w-4" />}
                  mostrarMonto="ninguno"
                  onClick={irADetalle}
                />
                <Seccion
                  titulo="Empleado debe devolver"
                  subtitulo="Saldo positivo: el empleado tiene dinero pendiente de devolver"
                  hojas={debenDevolver}
                  color="blue"
                  icon={<ArrowDownCircle className="h-4 w-4" />}
                  mostrarMonto="saldo"
                  onClick={irADetalle}
                />
                <Seccion
                  titulo="Empresa debe reembolsar"
                  subtitulo="Saldo negativo: el empleado gastó más que el anticipo"
                  hojas={debenReembolsar}
                  color="amber"
                  icon={<ArrowUpCircle className="h-4 w-4" />}
                  mostrarMonto="saldo"
                  onClick={irADetalle}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface AtajoCardProps { label: string; hint: string; count: number; icon: React.ReactNode; color: 'purple' | 'orange' | 'cyan'; onClick: () => void }
function AtajoCard({ label, hint, count, icon, color, onClick }: AtajoCardProps) {
  const cls = {
    purple: { border: 'border-purple-200 hover:border-purple-300', bg: 'bg-purple-50', text: 'text-purple-700' },
    orange: { border: 'border-orange-200 hover:border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700' },
    cyan:   { border: 'border-cyan-200 hover:border-cyan-300',     bg: 'bg-cyan-50',   text: 'text-cyan-700' },
  }[color]
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-md border transition-colors text-left ${cls.border} hover:bg-muted/30`}
    >
      <div className={`p-2 rounded-md ${cls.bg} ${cls.text}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${cls.text}`}>{count}</span>
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
      </div>
      <ArrowRight className={`h-4 w-4 ${cls.text} shrink-0`} />
    </button>
  )
}

interface SeccionProps {
  titulo: string
  subtitulo: string
  hojas: HojaDeGastos[]
  color: 'emerald' | 'blue' | 'amber'
  icon: React.ReactNode
  mostrarMonto: 'saldo' | 'ninguno'
  onClick: (id: string) => void
}

function ctaPara(h: HojaDeGastos): string {
  if (h.estado === 'revisado') return 'Validar primero'
  // estado === 'validado'
  if (Math.abs(h.saldo) <= 0.01) return 'Cerrar'
  if (h.saldo > 0) return 'Registrar devolución'
  return 'Registrar reembolso'
}

const seccionColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
}

function Seccion({ titulo, subtitulo, hojas, color, icon, mostrarMonto, onClick }: SeccionProps) {
  const c = seccionColors[color]
  if (hojas.length === 0) return null

  return (
    <Card className={`${c.border} mb-3`}>
      <CardHeader className={`${c.bg} py-3 px-4`}>
        <CardTitle className={`text-sm flex items-center gap-2 ${c.text}`}>
          {icon}
          {titulo}
          <Badge className={`${c.badge} ml-1 text-[10px] px-1.5 py-0 border-0`}>{hojas.length}</Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">{subtitulo}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {hojas.map(h => {
            const esRevisado = h.estado === 'revisado'
            return (
              <button
                key={h.id}
                onClick={() => onClick(h.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-3 sm:col-span-2 font-mono text-xs font-medium truncate">{h.numero}</span>
                  <span className="col-span-5 sm:col-span-3 text-xs truncate">{h.empleado?.name ?? '—'}</span>
                  <span className="hidden sm:block sm:col-span-3 text-[11px] text-muted-foreground truncate">
                    {h.proyecto ? h.proyecto.codigo : (h.centroCosto?.nombre ?? '—')}
                  </span>
                  <span className="hidden sm:flex sm:col-span-2 justify-center">
                    {esRevisado
                      ? <Badge className="bg-cyan-100 text-cyan-700 text-[10px] px-1.5 py-0 border-0">Revisado</Badge>
                      : <Badge className="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0 border-0">Validado</Badge>}
                  </span>
                  {mostrarMonto === 'saldo' ? (
                    <span className={`col-span-4 sm:col-span-2 text-right text-sm font-bold ${c.text}`}>
                      {formatCurrency(Math.abs(h.saldo))}
                    </span>
                  ) : (
                    <span className="col-span-4 sm:col-span-2 text-right text-[11px] text-muted-foreground">
                      {esRevisado ? 'Por validar' : `Validada ${formatDate(h.fechaValidacion)}`}
                    </span>
                  )}
                </div>
                <span className={`hidden md:inline-flex items-center gap-1 text-[11px] ${c.text} font-medium shrink-0 min-w-[140px] justify-end`}>
                  {ctaPara(h)}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
